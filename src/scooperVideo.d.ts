/*
 * @Author: yangyue yangyue@scooper.com.cn
 * @Date: 2023-06-06 11:12:42
 * @LastEditors: yangyue yangyue@scooper.com.cn
 * @LastEditTime: 2024-01-08 16:48:33
 * @FilePath: \scooper-video\src\scooperVideo.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 注册回调参数
export interface registered {
    symbole: boolean;
    sessionId: string;
}
 
declare global {
    interface Window {
        addScriptFlag: boolean;
        checkAudioDevicesStatus: any;
        VideoWebCast: any;
        VideoWebRtc: any;
        pocNo: string;
        hasAudioInputDevices: boolean;
    }
}

export interface VideoData {
 // Replace 'any' with the actual type of video data
}

export interface VideoOptions {
        dbClick: boolean; // 是否允许双击视频
        showVideoName: boolean; // 是否显示视频名称
        draggable: boolean; // 是否允许拖拽
        freeWindow: boolean; // 是否自由窗口
        windows: number;
        conf: any;
        pollInterval: number;
        windowsNum: number;
        isVideoTag: boolean;
        showVideoInfo: number;
        waitPlayQueueSwitch: boolean;
        defaultBusinessType: number;
        videoTipTimeOut: number;
        isShowChangeResolution: boolean;
        isShowChangeVideoSource: boolean;
        windowsArr?: number[];
        janus: any;
        isNotFistTip?: boolean;
        windowsBeginIndex: number;
        videoCodeType?: number;
        configOpt?: number;
        flag?: boolean;
        firstInitVertical?: boolean;
        openChangeWindowStrategy?: boolean;
        isWsPlay?: boolean;
        isExpand?: boolean; // 是否扩屏
        isShowAv: boolean; // 是否有麦克风和摄像头
}

export enum ScooperVideoEvent {

    INIT='initsucc', // 初始化成功

    ERROR = "msginfo", // 报错信息

    CLOSE = 'afterclose', //关闭的实例视频对象

    SHOWRESULT = 'showResult', // 显示结果

    ERRORMSG = 'errorMsg', // 错误信息

    STARTRECORDVIDEO = 'startRecordVideo', // 开始录制视频

    STOPRECORDVIDEO = 'stopRecordVideo', // 停止录制视频

    NOTIFYRESOLUTION = 'notifyresolution', // 分辨率

    NOTIFYRESOLUTIONCHANGE = 'notifyResolutionChange', // 分辨率改变

    NOTIFYVIDEOSOURCECHANGE = 'notifyVideosourceChange', // 视频源改变,前后摄像头

    NOTIFYCLOSEVIDEO = 'notifyCloseVideo', // 关闭视频

    REOPENVIDEO = 'reOpenVideo', // 重新打开视频

    NOTIFYTOTALTIME = 'notifyTotalTime', // 总时长
    
    NOTIFYSEEKTIME = 'notifySeekTime', // 当前播放时间

    LOCALSTREAM = 'localStream', // 本地流

    REMOTESTREAM = 'remoteStream', // 远程流

    PLAYSUCCESS = 'playsuccess', // 播放成功

    SCREENCHANGE = 'screenchange', // 分屏切换屏幕改变

    SETREGISTERED = 'setRegistered', // 注册回调

    DRAGEND = 'dragEnd', // 拖拽结束

    PLAYERROR = 'playError', // 播放错误

    STARTPOLL = 'startpoll', // 开始轮询

    STOPPOLL = 'stoppoll', // 停止轮询

    CLICK = 'click', // 窗口点击事件

}