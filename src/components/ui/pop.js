import React, {Component} from 'react';

class Pop extends Component {
    render() {
        return (
            <div className={['pop', this.props.config.type === 1 ? 'full' : ''].join(' ')}>
                {this.props.config.content === 'loading'}
                <div className="pop-inner">
                    {this.props.config.content === 'landscape' && <div className="pop-content ls">手机横屏体验</div>}
                    {this.props.config.content === 'loading' && <div className="pop-content load">Loading...</div>}
                </div>
            </div>
        );
    }
}

export default Pop;
