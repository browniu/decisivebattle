import flattenPromise from '../utils/flatten-promise';

export default class WSS {
    static defaultOptions = {
        /**
         * 超时时间
         * 默认: 20s
         */
        timeout: 20 * 1000
    };

    /**
     * 外部传入 websocket 实例
     * @param {WebSocket} ws - web socket 实例
     * @param {object} [options] 配置参数
     */
    constructor(ws, options = {}) {
        this.ws = ws;
        this.options = {...WSS.defaultOptions, ...options};
    }

    /**
     *
     * @param {Function} reject - promise reject
     * @param {number} timeout - 超时时间, 默认毫秒(ms)
     */
    createTimeout(reject, timeout = this.options.timeout) {
        return setTimeout(() => reject({message: '网络请求超时', code: -1000}), timeout);
    }


    /**
     * 创建 websocket on message 监听器
     * @param {MessageEvent} event - 时间
     * @param {Function} onMessage - ws 接收数据回调
     * @param {Function} resolve - promise resolve
     * @param {Function} reject - promise reject
     * @returns {Function}
     */
    createOnMessageListener(event, onMessage, {resolve, reject}) {
        if (event && event.data) {
            try {
                const jsonString = event.data;
                if (typeof jsonString === 'string') {
                    const response = JSON.parse(jsonString);
                    const {code, msg: message, data} = response;
                    if (code && typeof message === 'string' && data) {
                        onMessage({data, message, code}, {resolve, reject});
                        return;
                    }
                }
                reject(new Error(`非法 websocket response. response = ${jsonString}, data type = ${typeof jsonString}`));
            } catch (e) {
                // 通常可能数据结构解析出错
                reject(e);
            }
        }
        // 当 event.data 不满足基本数据结构时, 忽略该场景
    }

    /**
     * 发起 ws 数据包
     * @param {object} data - 主体数据
     * @param {Function} onMessage - ws 接收数据回调
     * @param {number} [timeout] - 自定义超时时间, 当不传入时默认使用当前实例 options 中的 timeout
     * @returns {Promise<any>}
     */
    send(data, {onMessage, timeout} = {}) {
        const {ws} = this;
        let timeoutHook;
        /**
         * 监听 websocket 数据回调
         * @param resolve
         * @param reject
         */
        let onMessageListener;
        /**
         * 回收 onMessage 监听器
         * @returns {*}
         */
        const recycleOnMessageListener = () => ws.removeEventListener('message', onMessageListener);
        /**
         * 当 promise 结束后执行
         */
        const onPromiseComplete = () => {
            recycleOnMessageListener();
            clearTimeout(timeoutHook)
        };
        const promise = new Promise((resolve, reject) => {
            ws.send(JSON.stringify(data));
            timeoutHook = this.createTimeout(reject, timeout);
            if (onMessage) {
                onMessageListener = (event) => this.createOnMessageListener(event, onMessage, {resolve, reject});
                ws.addEventListener('message', onMessageListener);
            } else {
                resolve();
            }
        });
        promise.then(onPromiseComplete, onPromiseComplete);
        return promise;
    }


    /**
     * 邀请玩家
     * @param {string} inviteeId - 受邀玩家id
     * @returns {Promise<any>}
     */
    invitePlayer(inviteeId) {
        const requestData = {code: 802 /* 状态码: 邀请玩家 */, invitee_id: inviteeId};
        return this.send(requestData, {
            onMessage({code, message, data}, {resolve, reject}) {
                switch (code) {
                    case 1803: /* 表示邀请成功, 并返回房间号, 此时游戏应该直接开始 */
                        const roomId = data.room_id;
                        resolve({data: {roomId}, code});
                        break;
                    case 1811: /* 被邀请玩家当前不在线 */
                    case 1812: /* 被邀请玩家正在游戏中 */
                        reject({code, message});
                        break;
                }
            }
        });
    }

    /**
     * 匹配玩家
     * @returns {Promise<any>}
     */
    matchingPlayer() {
        const requestData = {code: 801 /* 状态码: 匹配玩家 */};
        return this.send(requestData, {
            onMessage({code, message, data}, {resolve}) {
                // noinspection JSRedundantSwitchStatement
                switch (code) {
                    case 1803: /* 表示邀请成功, 并返回房间号, 此时游戏应该直接开始 */
                        const roomId = data.room_id;
                        resolve({data: {roomId}, code});
                        break;
                }
            },
            timeout: 5 * 1000
        });
    }

    /**
     * 匹配机器人
     * @returns {Promise<any>}
     */
    matchingRobot() {
        const requestData = {code: 809 /* 状态码: 匹配机器人 */};
        return this.send(requestData, {
            onMessage({code, message, data}, {resolve}) {
                // noinspection JSRedundantSwitchStatement
                switch (code) {
                    case 1803: /* 表示成功, 并返回房间号, 此时游戏应该直接开始 */
                        const roomId = data.room_id;
                        resolve({data: {roomId}, code});
                        break;
                }
            }
        });
    }

    /**
     * 匹配新手教程
     * @returns {Promise<any>}
     */
    matchingNewer() {
        const requestData = {code: 808 /* 状态码: 匹配新手教程 */};
        return this.send(requestData, {
            onMessage({code, message, data}, {resolve}) {
                // noinspection JSRedundantSwitchStatement
                switch (code) {
                    case 1803: /* 表示成功, 并返回房间号, 此时游戏应该直接开始 */
                        const roomId = data.room_id;
                        resolve({data: {roomId}, code});
                        break;
                }
            }
        });
    }


    /**
     * 匹配
     */
    async matching(isNewer) {
        // 匹配新手教程
        if (isNewer) return await this.matchingNewer()
        const [result, error] = await flattenPromise(() => this.matchingPlayer());
        if (result) {
            return result;
        }
        /**
         * 当请求超时, 认为无法匹配到玩家, 转而去匹配人机
         */
        if (error && error.code === -1000 /* 本地 code: 网络请求超时 */) {
            return await this.matchingRobot();
        }
        throw error;
    }

    /**
     * 接受邀请
     * @param {string} inviterId - 受邀玩家id
     * @returns {Promise<any>}
     */
    acceptInvitation(inviterId) {
        const requestData = {code: 803 /* 接受邀请 */, inviter_id: inviterId};
        return this.send(requestData, {
            onMessage({code, message, data}, {resolve}) {
                // noinspection JSRedundantSwitchStatement
                switch (code) {
                    case 1803: /* 表示成功, 并返回房间号, 此时游戏应该直接开始 */
                        const roomId = data.room_id;
                        resolve({data: {roomId}, code});
                        break;
                }
            }
        });
    }
}

