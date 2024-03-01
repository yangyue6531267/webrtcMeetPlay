/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-05 17:20:52
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2023-07-20 20:20:37
 * @FilePath: \scooper-video\src\component\polltimer.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * 轮巡工具类
 */
class PollTimer {
    private timerId: NodeJS.Timeout | null | number= null;
    private waitTimerId: NodeJS.Timeout | null | number= null;
    private cb: (arg0: boolean) => void;
    private time: number;

    constructor(cb: (arg0: boolean) => void, time: number) {
      this.cb = cb;
      this.time = time;
      cb(true); // 首次执行
      this.timerId = setInterval(cb, time * 1000);
    }
  
    // 结束轮询
    stop() {
      if (!this.timerId) return;
      clearInterval(this.timerId);
      this.timerId = null;
  
      if (this.waitTimerId) {
        clearTimeout(this.waitTimerId);
        this.waitTimerId = null;
      }
    }
  
    // 暂停轮询
    pause() {
      if (!this.timerId) return;
      clearInterval(this.timerId);
      this.timerId = null;
  
      if (this.waitTimerId) {
        clearTimeout(this.waitTimerId);
        this.waitTimerId = null;
      }
    }
  
    // 继续轮询
    continue() {
      // 重新开始轮询
      if (!this.timerId) {
        this.timerId = setInterval(this.cb, this.time * 1000);
      }
    }

    wait(time: number): Promise<void> {
        return new Promise(function (resolve, reject) {
          if (this.waitTimerId) {
            clearTimeout(this.waitTimerId);
            this.waitTimerId = null;
          }
          this.waitTimerId = setTimeout(resolve, time);
        });
      }
  }

  export default PollTimer;
  
  
  
  