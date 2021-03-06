import React, { Component } from "react";
import { View, Dimensions } from "react-native";
import { WebView } from "react-native-webview";

const injectedScript = function() {
  function waitForBridge() {
    if (window.postMessage.length !== 1) {
      setTimeout(waitForBridge, 200);
    } else {
      let height = 0;
      if (document.documentElement.clientHeight > document.body.clientHeight) {
        height = document.documentElement.clientHeight;
      } else {
        height = document.body.clientHeight;
      }
      postMessage({ height });
    }
  }

  waitForBridge();
};

const patchPostMessageFunction = function() {
  const originalPostMessage = window.postMessage;
  const patchedPostMessage = function(message, targetOrigin, transfer) {
    originalPostMessage(message, targetOrigin, transfer);
  };
  patchedPostMessage.toString = function() {
    return String(Object.hasOwnProperty).replace(
      "hasOwnProperty",
      "postMessage"
    );
  };
  window.postMessage = patchedPostMessage;
  window.postMessageNew = patchedPostMessage;
};

export default class MyWebView extends Component {
  state = {
    webViewHeight: Number
  };

  static defaultProps = {
    autoHeight: true
  };

  constructor(props: Object) {
    super(props);
    this.state = {
      webViewHeight: this.props.defaultHeight
    };

    this._onMessage = this._onMessage.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      this.state.webViewHeight !== nextState.webViewHeight ||
      (nextProps.source.uri && this.props.source.uri
        ? this.props.source.uri.length !== nextProps.source.uri.length
        : true) ||
      (nextProps.source.html && this.props.source.html
        ? this.props.source.html.length !== nextProps.source.html.length
        : true)
    );
  }

  decode = input => {
    let output = input;
    for (let i = 0; i < 5; i++) {
      output = decodeURI(output);
    }

    for (let i = 0; i < 5; i++) {
      output = decodeURIComponent(output);
    }

    return output;
  };

  _onMessage = e => {
    const data = this.decode(e.nativeEvent.data);
    if (/^{/.test(data)) {
      this.setState({
        webViewHeight: JSON.parse(data)["height"]
      });
    }
  };

  onLoadEnd = () => {
    const { additionalInjectedJavaScript } = this.props;
    this.webview.injectJavaScript(`
        try {
            var count = 0;
            var checkHeight = function () {
                var height = 0;
                if(document.documentElement.clientHeight > document.body.clientHeight)
                {
                    height = document.documentElement.clientHeight
                }
                else
                {
                    height = document.body.clientHeight
                }
                window.ReactNativeWebView.postMessage(JSON.stringify({height}));

                count++;

                if(count < 5) {
                    setTimeout(function() {
                        checkHeight();
                    }, 800);
                }
            }

            checkHeight();
            
            ${additionalInjectedJavaScript || ""} 
        } catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify(e.message)); }
    `);
  };

  stopLoading = () => {
    this.webview.stopLoading();
  };

  render() {
    const _w = this.props.width || Dimensions.get("window").width;
    const _h = this.props.autoHeight
      ? this.state.webViewHeight
      : this.props.defaultHeight;
    return (
      <WebView
        ref={ref => {
          this.webview = ref;
        }}
        injectedJavaScript={"const meta = document.createElement('meta'); meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'); meta.setAttribute('name', 'viewport'); document.getElementsByTagName('head')[0].appendChild(meta);true"}
        scrollEnabled={this.props.scrollEnabled || false}
        onMessage={this._onMessage}
        javaScriptEnabled={true}
        onLoadEnd={this.onLoadEnd}
        automaticallyAdjustContentInsets={true}
        {...this.props}
        style={[{ width: _w }, this.props.style, { height: _h }]}
      />
    );
  }
}
