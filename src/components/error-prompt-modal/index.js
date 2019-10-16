import React from 'react';
import './index.scss';

/**
 * 错误提示弹窗
 */

class ErrorPromptModal extends React.PureComponent {
    render() {
        const {message, children} = this.props;
        return (
            <div className="error-prompt-modal">
                <div className="error-prompt-main">
                    <div className="error-prompt-modal-mask"/>
                    <div className="error-prompt-modal-message">{message}</div>
                    {children}
                </div>
            </div>
        );
    }
}

/**
 * 错误提示弹窗 - 该玩家不在线
 * @param onClick
 * @example
 * <ErrorPromptModal.UserNotOnline onClick={()=> alert('点击了返回游戏主页')} />
 *
 * @returns {*}
 * @constructor
 */
const UserNotOnline = ({onClick}) => {
    return (
        <ErrorPromptModal message="该玩家不在线">
            <a className="error-prompt-modal-back-to-home" onClick={onClick}/>
        </ErrorPromptModal>
    )
};

ErrorPromptModal.UserNotOnline = UserNotOnline;

export default ErrorPromptModal;
