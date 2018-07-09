import React, { Component } from 'react';
import {
  View,
  Dimensions,
  WebView,
} from 'react-native';

const injectedScript = function () {
  function waitForBridge() {
    if (window.postMessage.length !== 1) {
      setTimeout(waitForBridge, 200);
    }
    else {
      let height = 0;
      if (document.documentElement.clientHeight > document.body.clientHeight) {
        height = document.documentElement.clientHeight
      }
      else {
        height = document.body.clientHeight
      }
      postMessage(height)
    }
  }
  waitForBridge();
};

const patchPostMessageFunction = function () {
  const originalPostMessage = window.postMessage;
  const patchedPostMessage = function (message, targetOrigin, transfer) {
    originalPostMessage(message, targetOrigin, transfer);
  };
  patchedPostMessage.toString = function () {
    return String(Object.hasOwnProperty).replace('hasOwnProperty', 'postMessage');
  };
  window.postMessage = patchedPostMessage;
  window.postMessageNew = patchedPostMessage;
};

export default class MyWebView extends Component {
  state = {
    webViewHeight: Number
  };

  static defaultProps = {
    autoHeight: true,
  }

  constructor(props: Object) {
    super(props);
    this.state = {
      webViewHeight: this.props.defaultHeight
    }

    this._onMessage = this._onMessage.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.webViewHeight !== nextState.webViewHeight ||
      (nextProps.source.uri && this.props.source.uri ? this.props.source.uri.length !== nextProps.source.uri.length : true) ||
      (nextProps.source.html && this.props.source.html ? this.props.source.html.length !== nextProps.source.html.length : true)
  }

  _onMessage(e) {
    console.log('_onMessage', e.nativeEvent);
    this.setState({
      webViewHeight: parseInt(e.nativeEvent.data)
    });
  }

  onLoadEnd = () => {
    setTimeout(() => {
      this.webview.injectJavaScript(`
      let height = 0;
      if(document.documentElement.clientHeight > document.body.clientHeight)
      {
        height = document.documentElement.clientHeight
      }
      else
      {
        height = document.body.clientHeight
      }
      postMessage(height)
    `);
    }, 500);
  }

  stopLoading() {
    this.webview.stopLoading();
  }

  render() {
    const _w = this.props.width || Dimensions.get('window').width;
    const _h = this.props.autoHeight ? this.state.webViewHeight : this.props.defaultHeight;
    return (
      <WebView
        ref={(ref) => { this.webview = ref; }}
        injectedJavaScript={'(' + String(patchPostMessageFunction) + ')();'}
        scrollEnabled={this.props.scrollEnabled || false}
        onMessage={this._onMessage}
        javaScriptEnabled={true}
        onLoadEnd={this.onLoadEnd}
        automaticallyAdjustContentInsets={true}
        {...this.props}
        style={[{ width: _w }, this.props.style, { height: _h }]}
      />
    )
  }
}
