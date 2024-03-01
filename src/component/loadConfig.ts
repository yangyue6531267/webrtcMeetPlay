/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-06 13:45:45
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2023-08-17 18:43:41
 * @FilePath: \scooper-video\src\component\loadConfig.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const loadConfig = {
        /**
         * 获取scooper-video的服务地址
         */
        videoWebServer: '',
        getVideoWebServer(): string {
            if (this.videoWebServer) return this.videoWebServer;
            Array.from(document.scripts).forEach(script => {
              const scriptSrc = script.src;
              if (scriptSrc.indexOf('scooper.video.js') >= 0) {
                this.videoWebServer = scriptSrc.substr(
                  0,
                  scriptSrc.indexOf('/scooper-video')
                );
                return false;
              }
            });
            return this.videoWebServer;
          },
        /**
         * 加载初始库
         */
        importClass() {
            const styleSheets = document.styleSheets;
            const existObj = {
              videoCss: 0,
              promptCss: 0,
              normalizeCss: 0
            };
          
            Array.from(styleSheets).forEach(styleSheet => {
              const cssSrc = (styleSheet as CSSStyleSheet).href;
              if (cssSrc) {
                if (
                  cssSrc.indexOf('/css/scooper.video.css') >= 0 ||
                  cssSrc.indexOf('/css/new/scooper.video.css') >= 0
                ) {
                  existObj.videoCss = 1;
                } else if (cssSrc.indexOf('/js/lib/prompt/prompt.css') >= 0) {
                  existObj.promptCss = 1;
                } else if (cssSrc.indexOf('/css/normalize.css') >= 0) {
                  existObj.normalizeCss = 1;
                }
              }
            });
          
            const videoWebServer = loadConfig.getVideoWebServer();
          
            // if (!existObj.videoCss) {
            //   const url = videoWebServer + '/scooper-video/css/scooper.video.css';
            //   this.importCss(url);
            // }
            // if (!existObj.promptCss) {
            //   const url = videoWebServer + '/scooper-video/js/lib/prompt/prompt.css';
            //   this.importCss(url);
            // }
            // if (!existObj.normalizeCss) {
            //   const url = videoWebServer + '/scooper-video/css/normalize.css';
            //   this.importCss(url);
            // }
        },
  
        /**
         * 异步加载 CSS 文件
         * @param {string} url CSS 文件的 URL
         */
        importCss(url:string) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = url;
            document.getElementsByTagName('head')[0].appendChild(link);
        },
        /**
         * 配置对象赋值,给loadCf
         * @param loadCf    程序设置配置(默认)
         * @param importCf    外部设置配置(优先) - 覆盖loadCf
         */
        extendConfig(loadCf: any, importCf: any) {
            for (const importCfKey in importCf) {
              const importConfVal = importCf[importCfKey];
              if (importConfVal || importConfVal === 0) {
                if (typeof importConfVal !== 'object') {
                  loadCf[importCfKey] = importConfVal;
                } else {
                  this.extendConfig(loadCf[importCfKey], importConfVal);
                }
              }
            }
        }
}

export default loadConfig;