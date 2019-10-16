/**
 * 错误上报
 * @param error
 */
export default function errorReport(error) {
    if (typeof error === 'object') {
        error = JSON.stringify(error);
    }
    if (window.Raven) {
        window.Raven.captureMessage(error, {
            level: 'info'
        });
    } else {
        console.error(error);
    }
}
