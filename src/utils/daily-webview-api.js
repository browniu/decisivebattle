import WVC from '@xfe/webview-community'

class DailyWebviewApi {
    // noinspection JSMethodCanBeStatic
    /**
     * 关闭游戏
     * @return {Promise}
     */
    closeGame() {
        return WVC.web.postMessage(WVC.EventNames.CLOSE_WEBPAGE);
    }
}

WVC.web.init(window);
const dailyWebviewApi = new DailyWebviewApi();
export default dailyWebviewApi;
