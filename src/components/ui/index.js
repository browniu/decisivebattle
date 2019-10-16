import React, {Component, Fragment} from 'react';
import {CSSTransition} from "react-transition-group"
import fetchJsonp from 'fetch-jsonp'
import dailyWebviewApi from '../../utils/daily-webview-api';
import Hammer from 'hammerjs'

class Ui extends Component {
    constructor(props) {
        super(props);
        this.config = this.props.config
        this.state = {
            guide: false,
            guideIndex: 0,
            rule: false,
            awards: false,
            rank: false,
            rankIndex: true,
            rankData: [undefined, undefined],
            /**
             * 是否看过新手教程
             */
            isGuideViewed: this.isCurrentUserRequireGuide(),
            pendingGameStart: false,
            rankListUpdate: true,
        }
    }

    render() {
        // 数据中转
        const {guide, rule, awards, rank} = this.state
        const popDisplay = guide || rule || awards || rank

        // 主渲染程序
        return (
            <Fragment>
                {/*弹窗*/}
                <CSSTransition in={popDisplay} timeout={300} classNames='fade' unmountOnExit>
                    <div className={'pop'}>
                        <div className="pop-inner">
                            {guide && this.Guide(guide)}
                            {rule && this.Rule()}
                            {awards && this.Awards()}
                            {rank && this.Rank()}
                        </div>
                    </div>
                </CSSTransition>
                {/*主体*/}
                <div className={'ui'}>
                    {this.Status(this.props.config.player)}
                    <div className="panel" onClick={(e) => this.menuControl(e)}>
                        {['规则', '排名', '新手引导'].map(e =>
                            <span title={e} key={e} className={'panel-button'} />)}
                    </div>
                    <div className="play">
                        <div className={'button'} onClick={() => this.config.start(false)} />
                        <div className={'button'} onClick={() => this.onStartClick(true)} />
                    </div>
                </div>
            </Fragment>
        );
    }

    /**
     * 用户是否需要看教程存储命名空间
     * @type {string}
     */
    userRequireGuideStorageNamespace = 'get-land:is-guide-viewed:1';

    /**
     * 当前用户是否已经看过新手教程
     * @returns {boolean}
     */
    isCurrentUserRequireGuide() {
        return !!Number(window.localStorage.getItem(this.userRequireGuideStorageNamespace));
    }

    /**
     * 设置当前用户已经看过新手教程
     */
    setCurrentUserGuideAsViewed() {
        window.localStorage.setItem(this.userRequireGuideStorageNamespace, '1');
        this.setState({isGuideViewed: true});
    }

    /**
     * 点击开始游戏
     * @param {boolean} isMatch - 是否匹配
     */
    onStartClick(isMatch) {
        const {isGuideViewed} = this.state;
        if (isGuideViewed) {
            this.config.start(true);
        } else {
            this.setState({guide: true, pendingGameStart: true});
        }
    }

    componentDidMount() {
        this.getRankData()
    }

    // 状态栏 -----------------------------------------------------------------------------------------------------------
    Status(player, vertical, reverse) {
        player = player || {
            name: '测试员',
            avatar: require('../../assets/images/avatar.png')
        }
        return (
            player && <div className={['status', vertical ? 'vertical' : '', reverse ? 'reverse' : ''].join(' ')}>
                <div className="avatar">
                    <span style={{backgroundImage: 'url(' + player.avatar + ')'}} />
                </div>
                <div className="info">
                    <div className="name">{player.name}</div>
                </div>
            </div>
        )
    }

    // 游戏规则 ---------------------------------------------------------------------------------------------------------
    Rule() {
        const items = [
            '玩家开始游戏会自动匹配到其中一方的势力进行对战；',
            '对战为实时对战，游戏时间3分钟，攻占对方势力越多据点的一方则胜利；',
            '中途掉线/退出会被判定为输；',
            '可以直接输入推栏ID邀请对应好友进行对战；',
            '匹配胜利可以获得积分，邀请对战只有第一场会获得积分，排行榜根据积分与胜率进行每天排名；',
            '胜率将会在完成匹配10场后显示,邀请对战的胜负不计算在胜率。',
            '游戏服务器会在每天的0:00-05:00进行维护，届时无法进行游戏。',
            '游戏与活动的最终解释权归西山居所有'
        ]
        return (
            <div className="pop-content rule">
                <div className="pop-close" onClick={() => this.setState({rule: false})} />
                <div className="title">游戏规则</div>
                <div className="content">
                    {items.map((item, i) => <li key={i}>{item}</li>)}
                </div>
            </div>
        )
    }

    // 奖品 ------------------------------------------------------------------------------------------------------------
    Awards() {
        return (
            <div className="pop-content rule">
                <div className="pop-close" onClick={() => this.setState({awards: false})} />
                <div className="title">奖励</div>

            </div>
        )
    }

    // 排行榜 -----------------------------------------------------------------------------------------------------------
    Rank() {
        return (
            <div className="pop-content rank">
                <div className="pop-close" onClick={() => this.setState({rank: false, rankIndex: true})} />
                <div className="rank-panel">
                    {[true, false].map((i) =>
                        <li key={i} onClick={() => {
                            this.setState({rankIndex: i, rankListUpdate: false})
                            // 切换更新机制
                            setTimeout(() => this.setState({rankListUpdate: true}), 50)
                        }} className={this.state.rankIndex === i ? 'act' : ''} />)}
                </div>
                <div className="rank-list">
                    <div className="rank-texture">
                        {[1, 2, 3, 4].map(i => <span key={i} />)}
                    </div>
                    {this.renderRankInner(this.state.rankIndex)}
                </div>
            </div>
        )
    }

    renderRankInner(index) {
        const player = this.props.config.player
        const display = this.state.rankData[0] && this.state.rankData[1]
        let data = this.state.rankData[0]
        if (!index) data = this.state.rankData[1]
        // 切换更新机制
        const {rankListUpdate} = this.state
        /**
         * 胜率 tab 是否被选中
         */
        const isWinRateTabActive = !!index;

        /**
         * 分数尾缀, 如胜率应该显示 %, 积分暂不显示
         * @type {string}
         */
        const scoreTailingSymbol = isWinRateTabActive ? '%' : '';
        /**
         * 当前排行
         */
        const currentRank = String(data.player_rank.rank) === '0' ? '未上榜' : data.player_rank.rank;

        return (
            display ? <div className="rank-inner">
                {rankListUpdate && <div className="rank-items">
                    {data.ranking_list.data.map((item, i) => {
                        return (
                            <div className="item" key={i}>
                                <div className="ranking"><span>{i + 1}</span></div>
                                <div className="avatar" style={{backgroundImage: 'url(' + item.person_avatar + ')'}} />
                                <div className="name">{item.person_name}</div>
                                <div className="data">{index ? item.win_rate : item.integral}{scoreTailingSymbol}</div>
                            </div>
                        )
                    })}
                    {data.ranking_list.data.length === 0 && <div className="rank-info">敬请期待</div>}
                </div>}
                <div className="rank-my">
                    <div className="ranking"><span>{currentRank}</span></div>
                    {player && <Fragment>
                        <div className="avatar" style={{backgroundImage: 'url(' + player.avatar + ')'}} />
                        <div className="name">{player.name}</div>
                        <div className="data">{index ? data.player_rank.win_rate : data.player_rank.integral}{scoreTailingSymbol}</div>
                    </Fragment>}
                </div>
            </div> : <div className="rank-info">未登陆</div>
        )
    }

    async getRankData() {
        const {host, port} = this.config.serve
        const rankRate = await fetchJsonp(host + port.rankRate).then(res => res.json());
        const rankScore = await fetchJsonp(host + port.rankScore).then(res => res.json());
        await this.setState({rankData: [rankRate.data.reply, rankScore.data.reply]})
    }

    /**
     * 关闭新手引导
     */
    onGuildPopClose = () => {
        /**
         * 设置当前用户已经看过新手教程
         */
        this.setCurrentUserGuideAsViewed();
        const {pendingGameStart} = this.state;
        if (pendingGameStart) {
            this.props.config.start(true, true);
        }
        this.setState({guide: false, guideIndex: 0, isGuideViewed: true, pendingGameStart: false});
    };

    // 新手引导 ---------------------------------------------------------------------------------------------------------
    Guide() {
        const guideImages = [
            require('../../assets/images/guide_1.png'),
            require('../../assets/images/guide_2.png'),
            require('../../assets/images/guide_3.gif'),
            require('../../assets/images/guide_4.gif')
        ];
        const {guideIndex} = this.state;

        return (
            <div className="pop-content guide">
                <div className="pop-close" onClick={this.onGuildPopClose} />
                <div className="guide-control">
                    <span className={guideIndex < guideImages.length - 1 ? 'act' : ''} onClick={() => this.guideSwitch(true)} />
                    <span className={guideIndex > 0 ? 'act' : ''} onClick={() => this.guideSwitch(false)} />
                </div>
                <ul className="guide-box" id={'playerGuides'}>
                    {guideImages.map((guideSrc, i) => (
                        <li style={{backgroundImage: `url(${guideSrc})`}} className={guideIndex === i ? 'act' : ''} key={i} />
                    ))}
                </ul>
            </div>
        );
    }

    guideSwitch(direction) {
        let index = this.state.guideIndex
        if (direction && index <= 2) this.setState({guideIndex: index + 1})
        else if (!direction && index >= 1) this.setState({guideIndex: index - 1})
    }

    // 手势插件
    guideHammer() {
        const square = document.querySelector('#playerGuides');
        const hammer = new Hammer(square)
        hammer.on('swipe', (e) => {
            if (e.offsetDirection === 2) this.guideSwitch(true)
            else this.guideSwitch(false)
        });
    }

    // 菜单面板 ---------------------------------------------------------------------------------------------------------
    async menuControl(e) {
        const title = e.target.getAttribute('title')
        switch (title) {
            case '规则':
                this.setState({rule: true})
                break
            case '排名':
                this.setState({rank: true})
                break
            case '奖励':
                this.setState({awards: true})
                break
            case '新手引导':
                await this.setState({guide: true})
                this.guideHammer()
                break
            default:
                break
        }
    }


    componentWillUnmount() {
        /**
         * 临时这么处理, 不推荐后续项目继续使用, 这是防止 unmount 后继续 setState 导致的报错
         */
        this.setState = f => f;
    }
}

export default Ui;
