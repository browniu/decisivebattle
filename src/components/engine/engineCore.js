import React, {Component} from 'react';
import Phaser, {Game} from 'phaser'
import Core from './core'
import './engine.scss'

class EngineCore extends Component {
    constructor(props) {
        super(props);
        this.state = {
            itemSize: 100,
            map: [9, 5],
            colors: [0xafe472, 0xa4d868, 0x2196f3, 0xe91e63],
            game: {
                line: {},
                lineGraphics: {},
                curve: null,
                path: {},
                star: {},
                particle: {},
                paths: [],
                curves: [],
                stars: null,
                particles: null,
                rects: [],
                launchState: false
            }
        }
    }

    render() {
        return (
            <div className={'engine'}>
                <div id="canvas" className={'cvs'} />
            </div>
        );
    }

    componentDidMount() {
        // 初始化游戏引擎
        if (!window.game) {
            const self = this;
            window.game = new Phaser.Game({
                type: Phaser.AUTO,
                backgroundColor: {r: 175, g: 228, b: 114, a: 0},
                parent: "canvas",
                height: this.state.itemSize * this.state.map[1],
                width: this.state.itemSize * this.state.map[0],
                scene: {
                    preload: function () {
                        self.preload(this);
                    },
                    create: function () {
                        self.create(this);
                    },
                    update: function () {
                        self.update(this);
                    }
                }
            });
        }
        console.log(window.game)
    }

    preload(phaser) {
        phaser.load.image("star", "../static/images/engine/star.png");
        phaser.load.image("hero0", "../static/images/qdp_game_ele_4.png");
        phaser.load.image("hero1", "../static/images/qdp_item_3.png");
        phaser.load.image("hero2", "../static/images/qdp_item_2.png");
        phaser.load.image("glow", "../static/images/engine/blue.png");
        phaser.load.image("glow2", "../static/images/engine/red.png");
        window.Phaser = phaser
    }

    create(phaser) {
        this.renderMap(phaser)
    }

    update(phaser) {}

    // RENDER-----------------------------------------------------------------------------------------------------------
    renderMap(phaser) {
        // 图形绘制器
        let graphics = phaser.add.graphics({fillStyle: {color: 0x8ec54e}});
        // 矩阵
        for (let i = 0; i < this.state.map[0]; i++) {
            for (let j = 0; j < this.state.map[1]; j++) {
                const rect = new Phaser.Geom.Rectangle(
                    this.state.itemSize * i,
                    this.state.itemSize * j
                );
                // 尺寸
                rect.width = rect.height = this.state.itemSize;
                // 着色规则
                if ((i + 1) % 2 === 0) {
                    if ((j + 1) % 2 === 0) {
                        graphics.fillStyle(this.state.colors[1]);
                    } else {
                        graphics.fillStyle(this.state.colors[0]);
                    }
                } else {
                    if ((j + 1) % 2 === 0) {
                        graphics.fillStyle(this.state.colors[0]);
                    } else {
                        graphics.fillStyle(this.state.colors[1]);
                    }
                }
                // 填充
                graphics.fillRectShape(rect);
                // 打包
                this.state.game.rects.push(rect);
            }
        }
    }
}

export default EngineCore;
