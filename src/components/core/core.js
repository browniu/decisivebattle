import React, {Component, Fragment} from 'react';
import './core.scss'
import WSS from '../../wss';
import InviteInput from '../invite-input';
import errorReport from '../../utils/error-report'

/**
 * 组件卸载时关闭 websocket (ws) 状态码
 * FBI WARNING: 根据规范, 当前状态码必须为 1000 !
 * @type {number}
 */
const UNMOUNT_CLOSE_WS_CODE = 1000;

class Core extends Component {
    render() {
        return (
            <div className={['gamebox', this.props.config.game ? 'render' : ''].join(' ')}>
                {this.Pop()}
                <div className={'game'}>
                    {this.renderStatus()}
                    <div className={['core', this.props.landscape ? '' : 'landscape'].join(' ')}>
                        <div className="bullet" />
                        <div className="map" onTouchEnd={(e) => this.touchEnd(e)} onTouchStart={(e) => this.touchStart(e)}>
                            {this.state.map.map((row, i) => <div className="row" key={i}>
                                {this.Gride(row, i)}
                            </div>)}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // CONST -----------------------------------------------------------------------------------------------------------
    constructor(props) {
        super(props);
        this.config = this.props.config
        this.isiOS = () => /iPhone|iPod|iPad/i.test(navigator.userAgent);
        this.audio = {}
        this.isiOS = () => /iPhone|iPod|iPad/i.test(navigator.userAgent)
        this.static = {
            chessColor: 'rgba(0,0,0,.2)',
            chessColorPress: 'rgba(0,0,0,.5)',
            mapScale: 0.75,
            map: [[null]]
        };
        this.timer = Date.now();
        this.state = {
            plaing: false,
            plaed: null,
            map: [[null]],
            posFrom: null,
            log: null,
            item: [0, 0],
            status: [0, 0],
            countdown: 0,
            usetime: 0,
            matched: false,
            invite: false,
            invited: false,
            inviteId: null,
            inviteInfo: undefined,
            inviteError: undefined,
            inviteRefuse: false,
            inviteCD: 20,
            beinvitedInfo: undefined,
            enemyInfo: undefined,
            /* true: 我是蓝方, false: 我是红方 */
            direction: true,
            result: null,
            attackAudio: false,
            matchCountdown: 3,
            chessSize: undefined
        };

        this.wsConnection = {
            MAX_TRY: 3,
            reTry: 0
        };

        this.pool = []/*初始化子弹池*/
    }

    // MOUNT -----------------------------------------------------------------------------------------------------------
    componentDidMount() {
        this.wsConnect()
        this.touchMove()
        this.bullet = document.querySelector('.bullet')
        this.audioBoxsInit()
    }

    componentWillReceiveProps(nextProps, nextState) {
        if (this.props !== nextProps) {
            const {config: nextConfig} = nextProps;
            const {config: prevConfig} = this.props;
            if (prevConfig.match !== nextConfig.match || prevConfig.game !== nextConfig.game) {
                this.matchMode(nextProps)
            }
        }
    }

    // 音效相关 ---------------------------------------------------------------------------------------------------------

    audioBoxsInit() {
        this.audioBox = {};
        this.audioBoxIndex = 0;
        this.audioBoxSize = 5;
        ['attack.wav', 'fly.wav'].forEach((path) => {
            const name = path.split('.') [0]
            this.audioBoxInit(path, name)
        })
    }

    audioBoxInit(path, name) {
        if (!path) return
        this.audioBox[name] = []
        for (let i = 0; i < this.audioBoxSize; i++) {
            const audio = new Audio()
            audio.src = require('../../assets/audio/' + path);
            this.audioBox[name].push(audio)
        }
    }

    audioBoxPlay(name) {
        if (!this.state.attackAudio && !this.audioBox[name]) return
        this.audioBox[name][this.audioBoxIndex].play()
        this.audioBoxIndex++
        if (this.audioBoxIndex >= this.audioBoxSize) this.audioBoxIndex = 0
    }

    // 匹配方式 ---------------------------------------------------------------------------------------------------------
    matchMode(props) {
        const {match, game, isNewer} = props.config
        if (!game) return
        if (this.ws) {
            if (match) setTimeout(() => {
                this.matching(isNewer)
            }, 500)
            else {
                this.setState({invite: true})
            }
        }
    }

    // 弹窗 -------------------------------------------------------------------------------------------------------------
    Pop() {
        const {player, back} = this.props.config
        const {plaed, plaing, matched, invite} = this.state;
        const display = !plaing;
        return (
            display &&
            <div className={['pop', plaed ? 'count' : '', plaing ? '' : 'match', matched ? 'matched' : ''].join(' ')}>
                <div className="pop-inner">
                    {matched && <Fragment>
                        {this.PopCount(player, back)}
                        {this.PopMatch(player)}
                    </Fragment>}
                    {(!matched && !invite) && '正在匹配'}
                    {invite && this.Invite(back)}
                </div>
            </div>
        )
    }

    PopCount(player, back) {
        const {result, direction, isEscape} = this.state;

        /**
         * 当没有结果时, 直接不进行渲染
         */
        if (!result) {
            return null;
        }
        const currentRoundResult = Core.getCurrentRoundResult(result.status, direction);
        /**
         * 胜率
         */
        const winPercentage = Number(result.win_percent);

        /**
         * 积分
         */
        const totalScore = parseInt(result.integral) || 0
        const totalScoreDistance = totalScore - parseInt(player.integral)

        const winPercentageDisplayText = winPercentage ? `${winPercentage}%` : '待计算';
        const hasWin = currentRoundResult === 'win';
        const hasDraw = currentRoundResult === 'draw';
        const hasLose = currentRoundResult === 'lose';
        const displayResultMessage = {
            win: '大佬还是大佬',
            lose: '下盘再接再厉',
            draw: '平局',
        }[currentRoundResult];
        /**
         * 用时
         * @type {number}
         */
        const consumeTime = result.end_time - result.start_time;
        return (
            this.state.plaed &&
            <div className="pop-content count">
                {hasWin && <div className="count-label win" />}
                {hasLose && <div className="count-label" />}
                {hasDraw && <div className="count-label draw" />}
                <div className="count-close" onClick={() => back()} />
                <div className="count-info">
                    <h5>{displayResultMessage}</h5>
                    <div className="sub">
                        {isEscape && <span>对手已被您的实力吓退</span>}
                        <span>用时：{consumeTime} 秒</span>
                        <span>胜率：{winPercentageDisplayText}</span>
                        <span className={'score'}>总积分：{totalScore}
                            {totalScoreDistance !== 0 &&
                            <i className={[totalScoreDistance > 0 ? 'plus' : 'minus'].join(' ')}> ({totalScoreDistance > 0 ? '+' : '-'}{totalScoreDistance})</i>}
                        </span>
                    </div>
                </div>
                <div className=" button back" onClick={() => back()} />
                {/*<div className={'button replay'} onClick={() => this.replay()} />*/}
            </div>
        )
    }

    /**
     * 当前这一轮的游戏结果
     * @param status - 本局状态 1-红方胜 2-蓝方胜 3-平局
     * @param direction - 蓝方时 direction 为 true, 红方时 direction 为 false
     * @returns {string}
     */
    static getCurrentRoundResult(status, direction) {
        if (status === 3) {
            /**
             * 平局
             */
            return 'draw';
        } else if ((status === 2 && direction === true /* 蓝方时 direction 为 true */ || status === 1 && direction === false /* 红方时 direction 为 false */)) {
            return 'win';
        } else {
            return 'lose';
        }
    }

    PopMatch(player) {
        const {plaing, beinvitedInfo, enemyInfo, inviteInfo, direction} = this.state
        let left = enemyInfo || beinvitedInfo || inviteInfo
        let right = player
        if (!direction) {
            left = player
            right = enemyInfo || beinvitedInfo || inviteInfo
        }
        return (!plaing && <div className="pop-content match">
            <div className={[
                'match-countdown',
                this.state.matchCountdown === 2 ? 'two' : '',
                this.state.matchCountdown === 1 ? 'one' : ''
            ].join(' ')} />
            {this.Status(left, true, false, false)}
            {this.Status(right, true, false, true)}
        </div>)
    }

    // 匹配页面倒计时 当前设定为3s
    matchCountdownRender() {
        this.matchCountdown = 3
        this.matchCountdownAble = true
        const matchCountdowner = () => {
            if (!this.matchCountdownAble) return
            this.setState({matchCountdown: this.matchCountdown})
            if (this.matchCountdown > 1) {
                setTimeout(() => {
                    this.matchCountdown--
                    matchCountdowner()
                }, 1000)
            } else {
                this.matchCountdownAble = false
            }
        }
        matchCountdowner()
    }

    // 邀请 -------------------------------------------------------------------------------------------------------------
    Invite(back) {
        const {invited, beinvitedInfo} = this.state
        return (
            <Fragment>
                {(beinvitedInfo) && this.Beinvited(back)}
                {(!beinvitedInfo && !invited) && this.InviteBefore(back)}
                {invited && this.InviteAfter(back)}
            </Fragment>
        )
    }

    InviteBefore(back) {
        const {inviteInfo, inviteError} = this.state
        const {player} = this.props.config
        return (
            <div className="pop-content rule invite">
                <div className="pop-close" onClick={() => {
                    back()
                    this.setState({inviteInfo: undefined, inviteError: undefined})
                }} />
                {!inviteInfo && <Fragment>
                    <div className="title">请输入邀请人的助手ID</div>
                    <form className="content" onSubmit={this.getInviteInfo}>
                        <div className="form">
                            <InviteInput onChange={(value) => this.setState({inviteId: value})} type="tel" />
                            <label>我的ID <span>{player.id}</span></label>
                        </div>
                        <div className="button" onClick={this.getInviteInfo} />
                    </form>
                </Fragment>}

                {(inviteInfo && !inviteError) && <Fragment>
                    <div className="invite-status">
                        {this.Status(inviteInfo, true)}
                    </div>
                    <div className="button invited" onClick={() => this.matchInvite(inviteInfo.id)} />
                </Fragment>}

                {inviteError && <Fragment>
                    <div className="title error">{inviteError}</div>
                </Fragment>}
            </div>
        )
    }

    InviteAfter() {
        const {inviteRefuse} = this.state
        return (<div className={['pop-content invited', inviteRefuse ? 'refuse' : ''].join(' ')}>
            {this.state.inviteRefuse ?
                <div className="invited-info">无应答</div>
                : <div className="invited-info">
                    <div className="title">正在邀请</div>
                    <div className="timedown">{this.state.countdown}</div>
                </div>
            }

        </div>)
    }

    getInviteInfo = async (e) => {
        e.preventDefault();
        let inviteId = this.state.inviteId;
        if (!inviteId) return;

        inviteId = inviteId.trim();

        const {player} = this.props.config;

        if (String(player.id) === inviteId) {
            alert('不能和自己匹配哦~');
            return;
        }
        const info = await this.props.config.getInfo(inviteId);
        console.log(info);
        if (!info) alert('查无此人');
        else {
            this.setState({inviteInfo: info})
        }
    };

    inviteCountDown() {
        this.setState({countdown: 20})
        this.clearInviteCountDownHook();
        this.inviteCountDownHook = setTimeout(() => {
            this.setState({inviteRefuse: true})
            /**
             * 仅展示 2.5 秒后自动关闭
             */
            this.inviteCountDownBackHook = setTimeout(() => {
                this.props.config.back();
            }, 2500)
        }, 20 * 1000);
        this.timeTD()
    }

    clearInviteCountDownHook() {
        clearTimeout(this.inviteCountDownHook);
        clearTimeout(this.inviteCountDownBackHook);
    }

    // 被邀请 -----------------------------------------------------------------------------------------------------------
    Beinvited() {
        const {beinvitedInfo} = this.state
        return (<div className="pop-content rule invite">
            <div className="invite-status">
                {this.Status(beinvitedInfo, true)}
            </div>
            <div className="title">邀请您加入决战大明宫</div>
            <div className="invite-panel">
                <div className="button refuse" onClick={() => this.beinvitedRefuse()} />
                <div className="button accept" onClick={() => this.beinvitedAccept()} />
            </div>
        </div>)
    }

    async beinvited(id) {
        this.inviter = id
        const info = await this.props.config.getInfo(id)
        if (!info) return
        this.props.config.beinvited()
        this.setState({beinvitedInfo: info})
    }

    beinvitedAccept() {
        if (this.inviter) {
            this.wss.acceptInvitation(this.inviter).then(
                ({data}) => {
                    /**
                     * 清空倒计时 timeout hook
                     */
                    this.createRoom(data.roomId);
                },
                ({message}) => {
                    window.that.setState({inviteError: message});
                }
            );
        }
    }

    beinvitedRefuse() {
        this.props.config.back()
        this.setState({beinvitedInfo: undefined, invite: false})
    }

    // 游戏模块 ---------------------------------------------------------------------------------------------------------
    Gride(row, i) {
        return (
            row.map((item, j) =>
                <span data-pos={[i, j].join(',')} className={[
                    'item',
                    item ? 'able' : '',
                    (item && item.player.id.match(/@@@/)) ? 'middle' : ''
                ].join(' ')} key={j}>
                {item && this.Chess(item)}
            </span>)
        )
    }

    Chess(item) {
        const {direction} = this.state
        const playerId = this.props.config.player.id.toString()
        const chessId = item.player.id
        const color = playerId === chessId ? 'blue' : 'red'
        return (
            <div data-num={item.current_soldier_num} id={item.id} className={[
                'chess',
                color,
                direction ? ' ' : 'reverse',
                chessId.match(/@@@/) ? 'middle' : ''
            ].join(' ')}>
                <i>{item.current_soldier_num}</i>
                <div className="demo" />
            </div>)
    }

    getChessSize() {
        const chess = document.querySelector('.item')
        if (chess) this.chessSize = [chess.clientWidth, chess.clientHeight]
    }

    Log() {
        return <div className="log">{this.state.log}</div>
    }

    // 状态栏 -----------------------------------------------------------------------------------------------------------
    renderStatus() {
        const {beinvitedInfo, enemyInfo, inviteInfo, direction} = this.state
        const {player} = this.props.config

        let left = enemyInfo || beinvitedInfo || inviteInfo
        let right = player

        if (!direction) {
            const leftTmp = left;
            left = right;
            right = leftTmp;
        }

        return (
            <div className="status-bar">
                <div className="countdown"><span>{this.state.countdown}</span></div>
                {this.Status(left, false, false, false)}
                {this.Status(right, false, true, true)}
            </div>
        )
    }

    Status(player, vertical, reverse, direction) {
        player = player || {
            name: '江湖小虾米',
            avatar: require('../../assets/images/avatar.png')
        }
        return (
            player &&
            <div className={[
                'status',
                vertical ? 'vertical' : '',
                reverse ? 'reverse' : '',
                direction ? 'right' : 'left'
            ].join(' ')}>
                <div className={['avatar', direction ? 'right' : 'left'].join(' ')}>
                    <span style={{backgroundImage: 'url(' + player.avatar + ')'}} />
                </div>
                <div className="info">
                    <div className="name">{player.name}</div>
                </div>
            </div>
        )
    }

    // TOUCH ===========================================================================================================

    touchStart(e) {
        this.from = undefined
        const dom = this.CoordDom([e.targetTouches[0].clientX, e.targetTouches[0].clientY])
        if (!dom || !dom.firstChild || !(dom.className.match(/able/) && dom.firstChild.className.match(/blue/))) return
        this.from = dom
    }

    touchMove() {
        document.querySelector('.map').addEventListener('touchmove', (e) => {
            e.preventDefault();
            // 判断出发点是否合法
            if (!this.from) return
            // 获取当前触摸点
            const dom = this.CoordDom([e.targetTouches[0].clientX, e.targetTouches[0].clientY])
            // 判断当前节点是否为可操作的据点
            if (!dom || dom === this.from || !dom.className.match(/able/)) {
                [...document.querySelectorAll('.item.able.active')].map(e => e.className = e.className.match(/middle/) ? 'item able middle' : 'item able')
            } else if (!dom.className.match(/active/)) {
                dom.className = dom.className + ' active'
            }
        }, {passive: false})
    }

    touchEnd(e) {
        // 重置样式
        // this.bullet.className = 'bullet';
        [...document.querySelectorAll('.item.able.active')].map(e => e.className = e.className.match(/middle/) ? 'item able middle' : 'item able')
        // 出发点筛选
        const from = e.target
        if (!from || !from.getAttribute('data-pos') || !from.firstChild || !from.firstChild.className.match(/blue/)) return
        // 目标点筛选
        const to = this.CoordDom([e.changedTouches[0].clientX, e.changedTouches[0].clientY])
        if (!to || !to.getAttribute('data-pos') || !to.className.match(/able/)) return
        // 装弹发射
        const fromPos = from.getAttribute('data-pos').split(',').map(e => parseInt(e))
        const toPos = to.getAttribute('data-pos').split(',').map(e => parseInt(e))
        this.attack(fromPos, toPos)
    }

    // 位置转坐标
    PosCoord(pos) {
        const dom = document.querySelector('.row:nth-child(' + (pos[0] + 1) + ') .item:nth-child(' + parseInt(pos[1] + 1) + ')')
        let rect = dom.getBoundingClientRect()
        if (this.isiOS) return [dom.offsetLeft + dom.clientWidth / 2, dom.offsetTop + dom.clientHeight / 2]
        return [rect.x + dom.clientWidth / 2, rect.y + dom.clientHeight / 2]
    }

    // 坐标转节点
    CoordDom(coord) {
        if (0) {
            const dom = document.querySelector('.core')
            const offset = dom.getBoundingClientRect()
            const x = Math.floor((coord[0] - offset.x) / this.state.item[0])
            const y = Math.floor((coord[1] - offset.y) / this.state.item[1])
            this.bullet.style.transform = 'translate(' + (coord[0] - offset.x - 15) + 'px,' + (coord[1] - offset.y - 30) + 'px)'
            this.setState({log: [x, y].join(',')})
            return document.querySelector('.row:nth-child(' + (x + 1) + ') .item:nth-child(' + parseInt(y + 1) + ')')
        } else {
            return document.elementFromPoint(coord[0], coord[1])
        }
    }

    // 位置转节点
    PosDom(pos) {
        return document.querySelector('.row:nth-child(' + (pos[0] + 1) + ') .item:nth-child(' + parseInt(pos[1] + 1) + ')')
    }

    // GAME ============================================================================================================

    // 匹配
    matching(isNewer) {
        // this.wsSend({code: 809})
        this.wss.matching(isNewer).then(
            ({data}) => {
                this.createRoom(data.roomId);
            },
            ({message}) => {
                window.that.setState({inviteError: message});
            }
        );
    }

    // 邀请匹配
    matchInvite(id) {
        setTimeout(() => {
            this.inviteCountDown();
            if (!this.state.inviteError) this.setState({invited: true})
        }, 700);
        // this.wsSend({code: 802, invitee_id: id})
        /**
         * 邀请玩家
         */
        this.wss.invitePlayer(id).then(
            ({data}) => {
                this.clearInviteCountDownHook();
                this.createRoom(data.roomId);
            },
            ({message}) => {
                window.that.setState({inviteError: message});
            }
        );
    }

    // 战斗
    fighting(data) {
        // 更新游戏画面
        const blueStatue = data.player_info[0].soldier_num
        const redStatus = data.player_info[1].soldier_num
        const map = data.map.map(row => row.map(item => data.objects[item]))
        const beat = data.attacks_event
        this.setState({status: [blueStatue, redStatus], map: map})
        // 发起进攻事件
        if (beat.length !== 0) this.beat(Object.values(beat))
    }

    // 打击渲染
    beat(event) {
        const info = this.config.player
        for (const e of event) {
            const player = (e.player_id === info.id.toString()) ? 'blue' : 'red'
            // 分离主动攻击的渲染
            if (player === 'blue') return
            // 分离主动攻击的渲染 以上
            const scale = this.scaleRate(e.soldier_num)
            const pos = [e.start_location, e.target_location]
            const during = e.consumption_time
            // this.launch(player, pos, during, scale)
            this.poolLaunch(player, pos, during, scale)
        }
    }

    // 主动进攻
    attack(from, to) {
        // 出发点和目的地相同
        if (from.join() === to.join()) return
        // 截流触发
        let cur = Date.now()
        if (cur - this.timer > 500) {
            //渲染进程
            // 分离主动攻击的渲染
            const number = this.PosDom(from).firstChild.getAttribute('data-num') / 2
            const player = 'blue'
            const scale = this.scaleRate(number)
            const pos = [from, to]
            const during = this.countDuring(from, to)
            // this.launch(player, pos, during, scale)
            this.poolLaunch(player, pos, during, scale)
            // 分离主动攻击的渲染 以上
            this.wsSend({
                code: 700,
                room_id: this.roomID,
                player_id: this.props.player,
                start_stronghold_location: from,
                target_stronghold_location: to,
                start_stronghold_id: this.PosDom(from).firstChild.getAttribute('id'),
                target_stronghold_id: this.PosDom(to).firstChild.getAttribute('id'),
            });
            //渲染进程 以上
            this.timer = cur
        }
    }

    // 计算两点间耗时
    countDuring(from, to) {
        const x = from[0] - to[0]
        const y = from[1] - to[1]
        const z = Math.max(Math.abs(x), Math.abs(y))
        return (z - 1) * 700 + 350
    }

    // 发射
    async launch(player, pos, during, scale) {
        // 处理过渡时间
        during = during <= 700 ? 1400 : during + 700

        // 子弹起落点偏移量
        let bulletPointOffset = [20, 20]
        if (this.chessSize) bulletPointOffset = [this.chessSize[0] / 4, this.chessSize[1] / 4]

        const parent = document.querySelector('.core')
        const coordFrom = this.PosCoord(pos[0])
        const coordTo = this.PosCoord(pos[1])
        this.beAttack(pos, during)
        const bullet = document.createElement('span')
        // 方向判断颜色交换
        if (!this.state.direction) {
            if (player.match(/red/)) player = 'blue'
            else if (player.match(/blue/)) player = 'red'
        }
        const bgc = require('../../assets/images/bomb_' + player + '.gif')
        const style = 'background-image:url(' + bgc + ');border-radius:50%;pointer-events:none;position: absolute;left: 0;top: 0;height: 30px;width: 30px;z-index: 99;transition:transform ' + (during) + 'ms ease-in, opacity 50ms linear;  background-size: contain;background-repeat: no-repeat;background-position: center;'
        const styleBefore = 'opacity:0;transform:translate(' + (coordFrom[0] - bulletPointOffset[0]) + 'px,' + (coordFrom[1] - bulletPointOffset[1]) + 'px) scale(' + scale + ');'
        const styleAfter = 'opacity:1;transform:translate(' + (coordTo[0] - bulletPointOffset[0]) + 'px,' + (coordTo[1] - bulletPointOffset[1]) + 'px) scale(' + scale + ');'
        bullet.setAttribute('style', style + styleBefore)
        await parent.appendChild(bullet)
        await setTimeout(() => bullet.setAttribute('style', style + styleAfter), 100)
        setTimeout(() => {
            parent.removeChild(bullet)
        }, during + 100)
    }

    /*对象池方案*/

    poolGene() {
        const bullet = document.createElement('span')
        bullet.className = 'pool-bullet';
        this.pool.push(bullet)
    }

    poolLaunch(player, pos, during, scale) {

        during = during <= 700 ? 1400 : during + 700//数据预处理
        const from = this.PosCoord(pos[0])
        const target = this.PosCoord(pos[1])

        let bulletPointOffset = [20, 20]// 子弹起落点偏移量
        if (this.chessSize) bulletPointOffset = [this.chessSize[0] / 4, this.chessSize[1] / 4]
        const poolNum = this.pool.length;

        if (poolNum <= 0) this.poolGene();/*池容量不足时生产新的元素*/

        if (!this.state.direction) {/*根据方向获取对应材质*/
            if (player.match(/red/)) player = 'blue'
            else if (player.match(/blue/)) player = 'red'
        }

        const texture = require('../../assets/images/bomb_' + player + '.gif')/*定制子弹样式*/
        const styleFrom = `background-image:url(${texture});display: inline-block;transition: transform ${during}ms ease-in, opacity .2s ease;transform: translate(${from[0] - bulletPointOffset[0]}px,${from[1] - bulletPointOffset[1]}px) scale(${scale});opacity: 1;`;
        const styleTarget = `background-image:url(${texture});display: inline-block;transition: transform ${during}ms ease-in, opacity .2s ease;transform: translate(${target[0] - bulletPointOffset[0]}px,${target[1] - bulletPointOffset[1]}px);opacity: 1;`;

        const bullet = this.pool.pop();/*获取子弹*/
        bullet.setAttribute('style', styleFrom);
        setTimeout(() => bullet.setAttribute('style', styleTarget), 50);

        if (poolNum <= 0) {/*挂载新的子弹*/
            const root = document.querySelector('.core')
            root.appendChild(bullet)
        }

        setTimeout(() => {/*卸载子弹*/
            bullet.setAttribute('style', '')
            this.pool.push(bullet)
        }, during + 50)

    }

    /*对象池方案*/

    // 阵营判断
    equalTeam(from, to) {
        const fromTeam = from.className.match(/blue/) ? 'blue' : 'red'
        if (to.className.match(/middle/)) return false
        const toTeam = to.className.match(/blue/) ? 'blue' : 'red'
        return fromTeam === toTeam
    }

    // 缩放比例
    scaleRate(value) {
        const scale = value / 50
        if (scale < 0.5) return 0.5
        if (scale > 2) return 2
        return scale
    }

    // 打击效果
    beAttack(pos, during) {
        const domFrom = this.PosDom(pos[0])
        const domTo = this.PosDom(pos[1])
        if (domTo.firstChild && domTo.firstChild.lastChild && domTo.firstChild.lastChild.className.match(/demo/)) {
            const chessFrom = domFrom.firstChild
            const chessTo = domTo.firstChild
            let plus = this.equalTeam(chessFrom, chessTo) ? 'plus' : ''
            const targetDemo = chessTo.lastChild
            this.audioBoxPlay('fly')
            setTimeout(() => {
                if (!targetDemo.className.match(/act/)) targetDemo.className = 'demo act ' + plus
                this.audioBoxPlay('attack')
            }, during)
            setTimeout(() => {
                targetDemo.className = 'demo'
            }, during + 500)
        }
    }

    // 重玩
    replay() {
        this.setState({plaed: null, map: this.static.map})
        setTimeout(() => {
            this.matching()
        }, 500)
    }

    // 倒计时
    timeTD() {
        clearTimeout(this.timer)
        if (!this.state.plaing && this.state.countdown === 180) return
        if (this.state.countdown > 0) {
            this.setState({countdown: this.state.countdown - 1})
            this.timer = setTimeout(() => this.timeTD(), 1000)
        }
    }

    // 游戏开始
    async start(data) {
        const leftID = data.player_info[0].player_id
        const rightID = data.player_info[1].player_id
        let direction = true
        if (String(leftID) === String(this.props.config.player.id)) {
            direction = false
        }

        this.props.config.exchangeBgm();
        const enemyID = String(leftID) === String(this.props.config.player.id) ? rightID : leftID;
        const enemyInfo = await this.props.config.getInfo(enemyID);
        this.setState({enemyInfo, matched: true, direction});
        const errorContent = {
            name: '错误排查：对战双方资料一致',
            player: this.props.config.player,
            enemy: enemyInfo,
            rightID,
            leftID,
            direction,
            data
        };

        // 错误排查：对战双方资料一致的问题
        errorReport(errorContent)
        console.log(errorContent)

        // 匹配页面倒计时
        this.matchCountdownRender()

        setTimeout(async () => {
            await this.setState({plaing: true, countdown: parseInt(data.remain_time) / 1000})
            this.timeTD()
        }, data.init_time || 3000)

        // 获取棋子尺寸
        if (!this.chessSize) {
            setTimeout(() => this.getChessSize(), 3500)
        }
    }

    // WS ==============================================================================================================
    wsConnect() {
        const player = this.props.config.player
        const gameToken = player ? player.token : Math.random()
        const wsUrl = this.props.config.serve.port.wsSource + encodeURIComponent(gameToken)
        console.log(wsUrl);
        this.ws = new WebSocket(wsUrl);
        this.wss = new WSS(this.ws);
        this.ws.onmessage = this.wsMessage;
        this.ws.onopen = this.wsOpen;
        this.ws.onerror = this.wsErr;
        this.ws.onclose = this.wsClose;
        window.that = this
    }

    wsOpen = (e) => {
        console.log('建立连接', JSON.stringify({
            targetUrl: e.target.url,
            type: e.open,
            timeStamp: e.timeStamp + 'ms'
        }, null, 2));
    };

    wsMessage = async (e) => {
        /**
         * 当成功连接后重置重试次数
         * @type {number}
         */
        this.wsConnection.reTry = 0;
        const data = JSON.parse(e.data);
        switch (data.code) {
            case 1801: //战斗数据
                window.that.fighting(data.data);
                break;
            // case 1803:
            //     /**
            //      * 创建房间
            //      */
            //     this.createRoom(data.data.room_id);
            //     break;
            case 1804:
                console.log('游戏结束', data);
                const response = data.data;
                // 判断是否逃跑
                const isEscape = data.data.over_type === 3
                this.ws.close();
                const {win_percent, integral} = await this.props.config.getInfo(this.props.config.player.id);
                Object.assign(response, {
                    win_percent: win_percent,
                    integral: integral,
                });
                window.that.setState({
                    plaing: false,
                    plaed: data.data.status,
                    countdown: 180,
                    usetime: 180 - window.that.state.countdown || 0,
                    result: response,
                    isEscape: isEscape
                });
                break
            case 1806:
                console.log('断线重连', data)
                break
            case 1808:
                console.log('游戏开始', data)
                window.that.start(data.data)
                break
            case 1813:
                console.log('被邀请', data)
                window.that.beinvited(data.data.player_id)
                break;
            case 1800: /* 服务端心跳 */
                // 根据俊华需求, 当接收到 1800 时, 发送一个客户端心跳
                this.wsSend({code: 900 /* 客户端心跳 */});
                break;
            default:
                break
        }
    };

    /**
     * 创建房间
     * @param {number} roomId - 房间 id
     */

    createRoom(roomId) {
        console.log('进入房间', window.that.props.config.player);
        window.that.wsSend({
            code: 800,
            room_id: roomId
        });
        this.roomID = roomId;
    }

    wsErr = (e) => {
        const {setFatalError} = this.props.config;
        console.log("建立连接失败", e);
        setFatalError('连接服务器失败');
    };

    wsClose = async (e) => {
        const {reTry, MAX_TRY} = this.wsConnection;
        const {setFatalError} = this.props.config;

        console.log('断开连接', {
            reason: e.reason,
            type: e.type,
            code: e.code,
            targetUrl: e.target.url,
            reTry
        });

        /**
         * 当状态码为 unmount 类型时, 判断允许通过 ws 关闭
         */
        if (e.code === UNMOUNT_CLOSE_WS_CODE) {
            return;
        }

        if (e.code === 4000 /* player_id已在线 */) {
            if (e.reason) {
                setFatalError(e.reason);
            }
            return;
        }

        if (e.code === 4001 /* game token 无效 */) {
            /**
             * 更新 token
             */
            await this.props.renewToken();
        } else {
            if (e.reason) {
                this.props.config.setErrorInfo(e.reason)
            }
        }

        this.wsConnection.reTry++;
        if (this.wsConnection.reTry < MAX_TRY) {
            /**
             * 用于让服务端清理部分时间, 所以等待1s
             */
            this.setTimeout(() => {
                this.wsConnect();
            }, 1000);
        } else {
            setFatalError('网络异常, 请稍后重试');
        }
    };

    wsSend(data) {
        this.ws.send(JSON.stringify(data));
    }

    setTimeout(action, timeout) {
        const timeoutHook = window.setTimeout(action, timeout);
        this.$$recycleQueue.push(() => window.clearTimeout(timeoutHook));
    }

    /**
     * 发起 unmount websocket 关闭操作
     */
    dispatchUnmountWebsocketCloseAction() {
        this.ws.close(UNMOUNT_CLOSE_WS_CODE, '当前组件即将卸载, 断开 ws 连接');
    }

    $$recycleQueue = [];

    componentWillUnmount() {
        /**
         * 临时这么处理, 不推荐后续项目继续使用, 这是防止 unmount 后继续 setState 导致的报错
         */
        this.setState = f => f;
        /**
         * 发起 unmount websocket 关闭操作
         */
        this.dispatchUnmountWebsocketCloseAction();
    }
}

export default Core;

