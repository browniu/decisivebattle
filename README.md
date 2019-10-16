# Decisivebattle
> 决战大明宫（策略对战游戏）


## Demo

![demo](./static/jzdmg.gif)

## Core 核心逻辑

### 对象池
```JavaScript
let pool = [];
let pooling = [];
function geneBullet(pool) {
    const bullet = document.createElement('span');
    bullet.className = 'bullet';
    pool.push(bullet)
}
async function launch(player, from, target, during) {
    // mock
    // during = 1000;
    // player = {blue: true};
    // from = [300, 100];
    // target = [100, 600];
    // 判断池量
    const poolNum = pool.length;
    if (poolNum <= 0) geneBullet(pool);

    // 初始化子弹
    const color = player.blue ? 'blue' : 'red';
    const styleFrom = `background:${color};display: inline-block;transition: transform ${during}ms ease-in, opacity .3s ease;transform: translate(${from.join('px,')}px);opacity: 1;`;
    const styleTarget = `background:${color};display: inline-block;transition: transform ${during}ms ease-in, opacity .3s ease;transform: translate(${target.join('px,')}px);opacity: 1;`;
    const bullet = pool.pop();
    bullet.setAttribute('style', styleFrom);
    setTimeout(() => bullet.setAttribute('style', styleTarget), 50);
    // 装载子弹
    if (poolNum <= 0) {
        const root = document.querySelector('.root');
        await root.appendChild(bullet);
    }
    // 卸载子弹
    setTimeout(() => {
        bullet.setAttribute('style', '');
        // setTimeout(() => bullet.setAttribute('style', styleFrom));
        pool.push(bullet);
    }, during + 50)
    //
}
```

### 资源预加载
```JavaScript
preload() {
    return Promise.all(this.preloadQueue.map(async (e) => {
        return this.preloadCore(e)
    }))
}
preloadCore(src) {
    return new Promise(resolve => {
        const img = new Image()
        img.src = src
        img.onload = resolve
    })
}
```
### 音效管理
```JavaScript
let audios = [];
let audioIndex = 0;
let audioSize = 10;

function play() {
    audios[audioIndex].play();
    audioIndex++;
    console.log(audioIndex);
    if (audioIndex >= audioSize) audioIndex = 0
}

function geneAudios() {
    for (let i = 0; i < audioSize; i++) {
        const audio = new Audio();
        audio.src = './demo2.mp3';
        audios.push(audio)
    }
    console.log(audios)
}

geneAudios()
```
### 滑动检测
```JavaScript
coord(dom) {
    let rect = dom.getBoundingClientRect()
    if (this.isiOS) return [dom.offsetLeft + dom.clientWidth / 2, dom.offsetTop + dom.clientHeight / 2]
    return [rect.x + dom.clientWidth / 2, rect.y + dom.clientHeight / 2]
}
```

## Install
```bash
yarn install && yarn start
```
