import React, {Component, Fragment} from 'react';
import {CSSTransition} from 'react-transition-group'
import fetchJsonp from 'fetch-jsonp'
import './index.scss'
import Ui from './ui/index'
import Core from './core/core'
import configs from '../configs';
import dailyWebviewApi from "../utils/daily-webview-api"

class Index extends Component {

    constructor(props) {
        super(props);
        this.serve = configs;
        this.state = {
            gameRender: false,
            game: false,
            guide: false,
            rule: false,
            player: undefined,
            landscape: true,
            landscapeRate: true,
            loaded: false,
            login: true,
            guideIndex: 0,
            audio: true,
            autols: false, // 是否自动横屏
            errorInfo: null,
            fatalError: null,
            match: true, // 是否直接匹配,
            bgm: 'bgm.mp3',
            isNewer: false,
        };
    }

    render() {
        return (
            <Fragment>
                {this.renderQuit()}
                {this.renderPop()}
                {this.renderCore()}
                {this.renderAudio()}
                {this.renderFatalError()}
            </Fragment>
        )
    }

    async componentDidMount() {
        this.landscapeMode(this.state.autols);
        await this.preload(true);
        this.login();
        this.reloadBgm()
        // this.autoPlayBgmOnBodyTouchOnce();
    }

    /**
     * 点击 body 时, 自动播放音频
     */
    autoPlayBgmOnBodyTouchOnce() {
        const onBodyTouchStartListener = () => {
            alert('进来了' + document.getElementById('music').play);
            document.getElementById('music').play();
            // destroyOnBodyTouchStartListener();
        };
        document.body.addEventListener('touchstart', onBodyTouchStartListener);
        const destroyOnBodyTouchStartListener = () => document.body.removeEventListener('touchstart', onBodyTouchStartListener);
        this.$$recycleQueue.push(destroyOnBodyTouchStartListener);
    }

    //  退出游戏
    renderQuit() {
        return (
            <div className={['quit', this.state.game ? 'game' : ''].join(' ')} onClick={() => dailyWebviewApi.closeGame()} />)
    }

    // 全局音效 ---------------------------------------------------------------------------------------------------------

    // 背景音乐
    renderAudio() {
        const {bgm} = this.state;
        return (
            this.state.audio &&
            <audio id="music" src={require('../assets/audio/' + bgm)} autoPlay loop />
        )
    }

    // 切换背景音乐
    exchangeBgm() {
        let bgm = 'bgm_game.mp3'
        if (this.state.bgm.match(/game/)) bgm = 'bgm.mp3'
        this.setState({bgm})
        this.reloadBgm()
    }

    // 重启背景音乐
    reloadBgm() {
        const dom = document.getElementById('music')
        dom.onload = () => {
            setTimeout(() => {
                dom.play()
            }, 50)
        }
    }

    // 分块渲染 ---------------------------------------------------------------------------------------------------------
    // 弹窗
    renderPop() {
        const popDisplay = !this.state.landscape || !this.state.loaded || !this.state.login || this.state.errorInfo;
        return this.renderPopWrapper({
            in: popDisplay,
            children: (
                <React.Fragment>
                    {!this.state.landscape && <div className="pop-content ls">手机横屏体验</div>}
                    {!this.state.loaded && <div className="pop-content load">正在加载游戏资源</div>}
                    {!this.state.login && <div className="pop-content rule login">
                        <div className="content">
                            登录小游戏失败, 请稍后重试
                        </div>
                    </div>}
                    {this.state.errorInfo && <div className="pop-content rule">
                        <div className="pop-close" onClick={() => this.setState({errorInfo: null})} />
                        <div className="content">
                            <div className="title center">
                                {this.state.errorInfo}
                            </div>
                        </div>
                    </div>}
                </React.Fragment>
            )
        });
    }

    renderPopWrapper({in: _in, children}) {
        const {landscape, loaded} = this.state;
        return (
            <CSSTransition in={_in} timeout={300} classNames='fade' unmountOnExit>
                <div className={['pop', (!landscape || !loaded) ? 'landscape' : ''].join(' ')}>
                    <div className="pop-inner">
                        {children}
                    </div>
                </div>
            </CSSTransition>
        );
    }

    /**
     * 渲染致命错误, 当出现致命错误时无法关闭
     * @returns {*}
     */
    renderFatalError() {
        const {fatalError} = this.state;
        return this.renderPopWrapper({
            in: !!fatalError,
            children: (
                <React.Fragment>
                    <div className="pop-content rule login">
                        <div className="content">
                            {fatalError}
                        </div>
                    </div>
                </React.Fragment>
            )
        });
    }

    setFatalError = (message) => {
        this.setState({fatalError: message});
    };

    // 主视觉
    renderCore() {
        const {game, gameRender} = this.state
        const UiProps = {
            player: this.state.player,
            serve: this.serve,
            start: (match, isNewer) => {
                isNewer = isNewer ? isNewer : false
                this.setState({game: true, match: match, isNewer: isNewer});
            }
        }
        const CoreProps = {
            game: this.state.game,
            match: this.state.match,
            player: this.state.player,
            serve: this.serve,
            isNewer: this.state.isNewer,
            back: () => this.back(),
            getInfo: (id) => this.getInfo(id),
            setErrorInfo: (info) => this.setState({errorInfo: info}),
            exchangeBgm: () => this.exchangeBgm(),
            setFatalError: this.setFatalError,
            beinvited: () => this.setState({game: true, match: false}),
        }
        return (<Fragment>
            {!game && <Ui config={UiProps} />}
            {gameRender && <Core config={CoreProps} renewToken={this.renewToken} />}
        </Fragment>)
    }

    /**
     * 更新 token
     */
    renewToken = () => {
        const MAX_TRY = 10;
        if (!this.renewTokenTry) {
            this.renewTokenTry = 0;
        }
        this.renewTokenTry++;
        /**
         * 重复超过10次更新 token, 判定死循环
         */
        if (this.renewTokenTry > MAX_TRY) {
            throw new Error(`getLand: 重复超过 ${MAX_TRY} 次更新 token, 判定死循环`);
        }
        const promise = this.login();
        promise.then(() => {
            this.renewTokenTry = 0;
        });
        return promise;
    };

    // 预加载 -----------------------------------------------------------------------------------------------------------
    async preload(able) {
        if (!able) {
            this.setState({loaded: true});
            return
        }

        // 处理路径
        function url(files) {
            return files.map(file => window.location.href + require('../assets/images/' + file))
        }

        // 递归
        function core(src) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = src;
            })
        }

        //执行
        const queue = url([
            'map.jpg',
            'index_bg.jpg',
            'flow_match.jpg',
            'chess_red.png',
            'chess_middle.png',
            'chess_blue.png',
            'bomb_red.png',
            'bomb_blue.png',
            'count_bg.png'
        ])

        await Promise.all(queue.map(async (e) => {
            return core(e)
        }))
        console.log('预加载完毕')
        setTimeout(() => {
            this.setState({loaded: true});
            const loadingDom = document.querySelector('.loading');
            if (loadingDom) {
                loadingDom.style.opacity = 0
                setTimeout(() => {
                    loadingDom.style.display = 'none';
                }, 500)
            }
        }, 1500)
    }

    // 横屏
    landscapeTest() {
        if (Math.abs(window.orientation) !== 90) this.setState({landscape: false})
        const onOrientationChange = () => {
            let landscape = true
            if (Math.abs(window.orientation) !== 90) landscape = false
            this.setState({landscape: landscape})
        };
        window.addEventListener("orientationchange", onOrientationChange, false);
        /**
         * unmount 时, 回收 resize 全局监听绑定
         */
        this.$$recycleQueue.push(() => window.removeEventListener('orientationchange', onOrientationChange));
    }

    // 屏幕尺寸
    resize() {
        let pre = 0;
        const onResize = () => {
            let cur = Date.now()
            let h = document.documentElement.clientHeight
            let w = document.documentElement.clientWidth
            if (cur - pre > 500) {
                pre = cur
                if (w / h > 2.8 || w / h < 1.5) this.setState({landscape: false})
                else this.setState({landscape: true})
            }
        };
        window.addEventListener('resize', onResize);
        /**
         * unmount 时, 回收 resize 全局监听绑定
         */
        this.$$recycleQueue.push(() => window.removeEventListener('resize', onResize));
    }

    // 横屏模式
    landscapeMode(status) {
        if (status) document.querySelector('.App').className = 'App autols'
        else {
            this.landscapeTest()
            // this.resize()
        }
    }

    // 返回
    back() {
        this.props.reload();
    }

    // 登陆
    async login() {
        let result = await fetchJsonp(this.serve.host + this.serve.port.login).then(res => res.json())
        if (result.data.reply) {
            const token = result.data.reply.game_token
            let info = await this.getInfo()
            info.token = token
            this.setState({player: info, gameRender: true})
        } else {
            this.setState({
                login: false,
                player: {token: Math.random(), name: '测试', avatar: require('../assets/images/avatar.png')}
            })
            console.log('登陆失败')
        }
    }

    // 获取玩家信息
    async getInfo(id) {
        id = id ? '?player_id=' + id : ''
        let result = await fetchJsonp(this.serve.host + this.serve.port.info + id).then(res => res.json())
        if (result && result.data.reply) {
            result = result.data.reply
            return {
                name: result.person_name,
                avatar: result.person_avatar,
                id: result.player_id,
                pass: result.pass_novice,
                integral: result.integral,
                win_percent: result.win_rate
            }
        }
    }

    /**
     * 回收队列
     * @type {Array}
     */
    $$recycleQueue = [];

    componentWillUnmount() {
        /**
         * 临时这么处理, 不推荐后续项目继续使用, 这是防止 unmount 后继续 setState 导致的报错
         */
        this.setState = f => f;
        /**
         * 垃圾回收
         */
        this.$$recycleQueue.forEach(action => action());
    }
}

export default Index;
