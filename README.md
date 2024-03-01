# 安装

## `<script>`

```html
<!DOCTYPE html>
<html lang="en">
    
<head>
  <script src="./scooper.video.min.js"></script>
  <script>
    let videoOpts = {
        //初始化时的界面显示的分屏树
        draggable: boolean;  //是否可拖拽
        freeWindow: boolean; // 是否自由窗口
        windows: number;  // 初始化窗口数量
        conf: any; // 会议配置
        pollInterval: number; // 轮询时间
        windowsNum: number; // 总窗口数量
        isVideoTag: boolean;  // 视频或音频
        showVideoInfo: number;  // 是否显示视频信息
        waitPlayQueueSwitch: boolean; // 是否有等待播放队列
        defaultBusinessType: number;  // 默认业务类型 0 调度 1 勤指
        videoTipTimeOut: number; // 视频无首屏超时时间
        windowsArr?: number[]; // 窗口分屏类型数组
        windowsBeginIndex: number; // 窗口分屏类型数组开始索引 从哪个窗口开始播
        firstInitVertical?: boolean; // 是否是垂直分屏
        openChangeWindowStrategy?: boolean; // 窗口切换时是否关闭多余窗口
    }
    const videoArea = document.querySelector('.webVideo');
    const videoController = new VideoWebRtc(videoArea, videoOpts);

    // 注册成功
     videoController.addListener('initsucc', function (e) {
            console.log("注册成功", e);
            // 单窗口调用
            videoController.initVideoNum(document.querySelector(`.videoWeb`)).then(res => {
                    console.log(res)
            }).catch( err => {
                    console.log(err)
             } )
            // 单窗口1调用
            videoController.initVideoNum(document.querySelector(`.videoWeb1`)).then(res => {
                    console.log(res)
            }).catch( err => {
                    console.log(err)
             } ) 
     })
    //
     
  </script>
</head>
<body>
 // 会议方案
 <div class='web-rtc-video'>

    </div>
    // 直播方案
    <div class='webVideo'>
        <div class='videoWeb'></div>
        <div class='videoWeb1'></div>
        <div class='videoWeb2'></div>
    </div>
</body>
```

## `npm`

```shell
# 最新稳定版本
npm install scooper-video
```

```js
    import VideoWebRtc from 'scooper-video'
    const videoArea = document.querySelector('.webVideo');
    const videoController = new VideoWebRtc(videoArea, videoOpts);
```

# videoOpts功能参数


| 名称                     | 默认值                              | 描述                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| videoArea                | document.querySelector('.webVideo')| 播放器容器元素                                                          |
| freeWindow               | flase                              | 是否自由窗口                                                            |
| draggable                | true                               | 是否可拖拽                                                              |
| windows                  | navigator.language.toLowerCase()   | 初始化窗口数量                                                           |
| conf                     | {}                                 | 会议配置                                                                |
| pollInterval             | number                             | 轮询时间                                                                |
| windowsNum               | 'auto'                             | 总窗口数量                                                              |
| isVideoTag               | true                               | 视频或音频                                                              |
| showVideoInfo            | [0,1,2]                            | 是否显示视频信息                                                         |
| waitPlayQueueSwitch      | -                                  | 是否有等待队列                                                           |
| defaultBusinessType      | -                                  | 默认业务类型 0 调度 1 勤指                                               |
| videoTipTimeOut          | -                                  | 视频无首屏超时时间                                                       |
| windowsArr               | -                                  | 窗口分屏类型数组                                                         |
| windowsBeginIndex        | -                                  | 窗口分屏类型数组开始索引 从哪个窗口                                        |
| firstInitVertical        | -                                  | 是否是垂直分屏                                                           |
| openChangeWindowStrategy | -                                  | 窗口切换时是否关闭多余窗口                                                |
| isWsPlay                 | -                                  | 自适应h264 h265配置项                                                    |


# events 事件

```js
  enum ScooperVideoEvent {

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

  }
```


# API

/* -----------------------------播放事件 --------------------------- */

- videoController.play(index, video, id, opts): 播放视频
  
| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                        |
| video                    | String                             | 视频编号（ID）                                                          |
| id                       | true                               | 如果没有，使用视频ID                                                     |
| opts                     | json                               | 初始化参数                                                           |

- playAll(array: { video: string; id: string; opts?}[]): void: 播放所有视频

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| array                    | array                              | 窗口编号，从0开始                                                        |
| id                       | String                             | 视频总标识（ID）                                                        |
| opts                     | json                               | 初始化参数                                                          |

- videoController.playByOrder(video: string, id: string, opts:any,isReplace=true): 按顺序播放视频,返回true/false 

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | String                             | 视频编号（ID）                                                          |
| id                       | true                               | 如果没有，使用视频ID                                                     |
| opts                     | json                               | 初始化参数                                                           |
| isReplace                     | boolean                               | 视频已满情况下，是否替换0窗口的视频                                                     |

- videoController.playByOrderInSceen(video: string, id: string, opts: any): 在序号最小的空闲窗口播放视频 只在当前分屏情况下查找,返回true/false
  
| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | String                             | 视频编号（ID）                                                          |
| id                       | true                               | 如果没有，使用视频ID                                                     |
| opts                     | json                               | 初始化参数                                                           |

- videoController.playByOrderAll({ videoArray, isExpand = true}): 按顺序播放视频,返回true/false

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| videoArray                    | array                             | 视频编号（ID）                                                          |
| isExpand                       | boolean                               | 是否自动扩展窗口                                                     |

- videoController.playByOrderExpandWindow(video: string, id: string, opts: any,isReplace=true): 扩展视频窗口数的播放方式

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | String                             | 视频编号（ID）                                                          |
| id                       | true                               | 如果没有，使用视频ID                                                     |
| opts                     | json                               | 初始化参数                                                           |
| isReplace                     | boolean                               | 视频已满情况下，是否替换0窗口的视频                                                     |


- videoController.playInChoice(video, id, opts): 在鼠标选中的窗口中播放视频
 
| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| array                    | array                              | 窗口编号，从0开始                                                        |
| id                       | String                             | 视频总标识（ID）                                                        |
| opts                     | json                               | 初始化参数                                                          |

- videoController.clearScreen(video): 关闭指定视频编号的屏幕以及id

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | String                             | 视频编号（ID）                                                        |

- videoController.getWindowsNum(): 获取视频窗口数

- videoController.addListener(event, callback): 添加事件监听

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| event                    | String                             | 事件名称                                                               |
| callback                 | Function                           | 事件回调                                                               |

- videoController.removeListener(event, callback): 移除事件监听

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| event                    | String                             | 事件名称                                                               |
| callback                 | Function                           | 事件回调                                                               |
- videoController.removeAllListeners(event): 移除所有事件监听

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| event                    | String                             | 事件名称                                                               |

- videoController.isPlaying(video): 检索当前点的视频是否被播放，被播放则返回播放的视频窗口

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | String                             | 视频编号（ID）                                                        |

- videoController.isPlayingByIndex(index): 检索当前点的视频是否被播放，被播放则返回播放的视频窗口


| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |

/* ----------------------------- 窗口事件 --------------------------- */
  
- videoController.initVideoNum(video): 初始化视频窗口,返回promise 
  
| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | String                             | 视频编号（ID）                                                        |

- videoController.fileControl(index, opts): 控制指定视频编号的文件
  
| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                        |
| opts                     | json                               | 初始化参数                                                           |

- videoController.getNextWindowsNum(old): 获取下一个窗口的编号

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| old                    | number                             | 上一个窗口的编号                                                        |

- videoController.getVideoData(): 获取视频数据 

- videoController.sipCallSendMsg(msg: any)：sip呼叫发送消息

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| msg                    | any                             | 消息                                                         |

- videoController.updateVideoNameStatus(tel:number,peopleName:string)：更新视频窗口名字的状态

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| tel                    | number                             | 电话号码                                                         |
| peopleName                    | string                             | 人员名字                                                         |

- videoController.openPocCall(pocNo: string, centerTel: string): 打开poc呼叫 开启对讲预呼叫

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| pocNo                    | string                             | poc号码                                                         |
| centerTel                    | string                             | 中心号码                                                         |


- videoController.closePocCall(pocNo: string, centerTel: string): 关闭poc呼叫 关闭对讲预呼叫

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| pocNo                    | string                             | poc号码                                                         |
| centerTel                    | string                             | 中心号码                                                         |


- videoController.setRecordAvBusinessId(businessId: string): 设置录像的businessId

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| businessId                    | string                             | 录像的businessId                                                         |

- videoController.sendAudio(index: number): 发送音频

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |

- videoController.recvAudio(index: number): 接收音频

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |

- videoController.lockVideo(index: number): 锁定视频

- videoController.unlockVideo(index: number): 解锁视频

- videoController.close(index: number, isSave?: boolean, elementIndex?: number): 关闭视频

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |
| isSave                    | boolean                             | 是否保存关闭状态                                                         |
| elementIndex                    | number                             | 传入后返回  elementIndex参数，gis关闭使用                                                      |


- videoController.closeByVideo(video: string, isSave: boolean,iscloseVideoId:boolean): 关闭指定视频编号的视频
  
| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | String                             | 视频编号（ID）                                                        |
| isSave                    | boolean                             | 是否保存关闭状态                                                         |
| iscloseVideoId                    | boolean                             | 是否清空dom上的id                                                         |

- videoController.closeAll(isSave: boolean = false): 关闭所有视频

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| isSave                    | boolean                             | 是否保存关闭状态                                                         |

- videoController.setWindowsNum(num: number, opts: any): 设置窗口数量

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| num                    | number                             | 窗口数量                                                         |
| opts                    | json                             | 初始化参数                                                         |

- videoController.gisSetWindowsNum(num: number, showNumber: number): gis设置窗口数量
  
| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| num                    | number                             | 窗口数量                                                         |
| showNumber                    | number                             | 显示窗口数量                                                         |

- videoController.setSpeakType(type: number): 设置发言人类型

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| type                    | number                             | 音频类型                                                         |


- videoController.changeVideoSource(index: number, videoSource: string): 切换前后摄像头

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |
| videoSource                    | string                             | 0-后置摄像头   1-前置摄像头                                                         |

- videoController.startAvRecord(index: number): 开始录像

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |

- videoController.stopAvRecord(index: number): 结束录像

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |

- videoController.changeResolution(index: number, resolution: string): 改变分辨率

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，从0开始                                                         |
| resolution                    | string                             | 分辨率                                                         |

- videoController.setFullScreen($dom:any): 设置全屏

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| $dom                    | any                             | dom元素                                                         |

- videoController.getVideoControllerOpts(): 获取当前视频控件的配置项

- videoController.getScreenCaptureData(index?: number, callback?: (dataUrl: string) => void): 获取截屏数据

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| index                    | number                             | 窗口编号，可选参数。如果不提供，则使用当前选择窗口的index。                                                         |
| callback                    | Function                             | 回调函数                                                         |

- videoController.playHistory(video: any, startTime: string, endTime: string, opts?: any): 视频回放

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | any                             | 视频对象                                                         |
| startTime                    | string                             | [YYYY-MM-DDTHH:mm:ss]                                                         |
| endTime                    | string                             | 结束时间                                                         |
| opts                    | json                             | 配置选项                                                         |

- videoController.closeHistory(video: any, index?: number): 关闭历史流

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | any                             | 视频对象                                                         |
| index                    | number                             | 窗口编号，可选参数。如果不提供，则使用当前选择窗口的index。                                                         |

- videoController.historyControl(video: any, playType: string, playSpeed: number, startTime?: string): 历史流控制

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| video                    | any                             | 视频对象                                                         |
| playType                    | string                             | 播放类型（play、pause、stop）                                                         |
| playSpeed                    | number                             | 播放速率                                                         |
| startTime                    | string                             | 回放时间                                                         |

- videoController.saveList(): 保存视频列表

- videoController.playSaveList(): 播放保存的视频列表 

- videoController.isUnavailable(): 询问是否无可用窗口
  
- videoController.changeCurscreen(id: number): 切换到当前屏幕显示 共享

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| id                    | number                             | 视频ID                                                         |

 /* ----------------------------- 轮巡功能事件 --------------------------- */


- videoController.startPoll(array: any[], time: number): 执行轮巡

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| array                    | array                             | 轮巡的视频设备数组 [{video: devId, id: devId, opts: {}}]                                                         |
| time                    | number                             | 轮巡时间间隔（毫秒）                                                         |

- videoController.startPollByStatus(array: any[], time?: number): 根据在线/离线状态开始进行轮询

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| array                    | array                             | 轮巡的视频设备数组 [{video: devId, id: devId, status: 'offline/online', opts: {}}]                                                         |
| time                    | number                             | 轮巡时间间隔（毫秒）                                                         |  

- videoController.updatePollStatus(newStatusArr: any[]): 更新轮询状态

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| newStatusArr                    | array                             | 新的状态数组 [{video: '8001', id: '8001', status: 'online/offline', opts: {}}]                                                         |

- videoController.stopPoll(): 结束轮巡
  
- videoController.pausePoll(): 暂停轮询
  
- videoController.continuePoll(): 继续轮询
  
- videoController.isPolling(): 获取是否在轮巡
  

- videoController.holder(type: string, opts: any, isStop: boolean): 云台控制

| 参数                      |类型                                | 说明                                                                   |
| :----------------------- | :--------------------------------- | :--------------------------------------------------------------------- |
| type                    | string                             | 控制类型                                                         |
| opts                    | json                             | 控制选项                                                         |
| isStop                    | boolean                             | 是否停止                                                         |

