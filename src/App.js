import React from 'react';
import './App.css';
import Index from './components/index'

export default class App extends React.PureComponent {
    state = {
        indexKey: 0
    };

    componentDidMount() {
        /**
         * 以下代码用于测试
         */
        // document.addEventListener("keydown", (e) => {
        //     const keyCode = e.keyCode;
        //     if (keyCode === 13 /* 回车*/) {
        //         this.setState({indexKey: this.state.indexKey + 1})
        //     }
        // }, false);
    }

    /**
     * 强制重新 render Index 页面组件
     */
    onReload = () => {
        this.setState({indexKey: this.state.indexKey + 1})
    };

    render() {
        const {indexKey} = this.state;
        return (
            <div className="App">
                <Index key={indexKey} reload={this.onReload}/>
            </div>
        );
    }
}
