/**
 * 获取 websocket 当前应该使用的协议
 * @returns {string}
 */
export default function getWebSocketProtocol() {
    return window.location.protocol === 'https:' ? 'wss:' : 'ws:';
}
