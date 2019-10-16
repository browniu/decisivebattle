const getWebSocketProtocol = require('../utils/get-websocket-url').default;

const websocketProtocol = getWebSocketProtocol();

// noinspection ConstantConditionalExpressionJS,SpellCheckingInspection
module.exports = {
    host: '//ws.xoyo.com',
    port: {
        login: '/jx3/strongholdgame/get_game_token',
        rankScore: '/jx3/strongholdgame/integral_ranking?page=1&length=100',
        rankRate: '/jx3/strongholdgame/win_rate_ranking?page=1&length=100',
        info: '/jx3/strongholdgame/get_player_info',
        wsSource: websocketProtocol === 'wss:' ? `wss://ws.xoyo.com:31201/?game_token=` : `ws://ws.xoyo.com:31200/?game_token=`,
    }
};
