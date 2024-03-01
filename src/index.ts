/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-05 14:33:45
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2023-11-02 20:19:47
 * @FilePath: \scooper-video\src\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/index.ts
import "../less/index.less";
import scooperVideo from './component/scooperVideo';
import VideoWebRtc from './component/videoWebRtc';

window.VideoWebRtc = VideoWebRtc;
export default VideoWebRtc;
  