import React from 'react';

/**
 * 邀请输入框
 */
export default class InviteInput extends React.PureComponent {

    state = {
        value: InviteInput.getInvitePlayerIdFromStorage()
    };

    /**
     * 保存邀请玩家 player id 到存储中
     * @param {string} playerId - 玩家 id
     */
    static saveInvitePlayerIdToStorage(playerId) {
        window.localStorage.setItem('get-land:invite-id', playerId);
    }

    /**
     * 通过存储中获取邀请 id
     * @returns {string}
     */
    static getInvitePlayerIdFromStorage() {
        try {
            try {
                return window.localStorage.getItem('get-land:invite-id') || '';
            } catch (e) {
                window.localStorage.removeItem('get-land:invite-id');
                return '';
            }
        } catch (e) {
            return '';
        }
    }

    onChange = (e) => {
        const value = e.target.value;
        const {onChange} = this.props;
        onChange(value);
        this.setState({value});
        InviteInput.saveInvitePlayerIdToStorage(value);
    };

    componentDidMount() {
        this.props.onChange(this.state.value);
    }

    render() {
        const {value} = this.state;
        return (
            <input onChange={this.onChange} value={value} type="tel"/>
        );
    }
}
