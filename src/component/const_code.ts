const CONST_CODE = {
    //打开失败错误码,面板显示,不做浮窗提示框显示
    VIDEO_CODE: {
        2002: '打开失败，未找到该ID的视频源',
        2003: '打开失败，请确认视频服务版本',
        3001: '打开失败，未接收到引流包，请检查端口映射',
        3002: '',
        3003: '打开失败，对方拒绝视频请求',
        4001: '打开失败，视频流中断',
        4002: '终端挂机或超时未接听',
        7000: '打开失败，无法连接视频设备',
        7001: '打开失败，无法连接视频设备',
        7002: '打开失败，无法连接视频设备'
    },

    OTHER_CODE: {
        453: 'videoServer连接失败，错误码453',
        454: '视频窗口已被占用，请选择其它窗口打开或停止播放',
        455: '操作失败，该段时间无视频录像',
        499: '操作异常，错误码499',
        440: '操作异常，错误码440',
        441: '操作异常，错误码441',
        442: '操作异常，错误码442',
        443: '操作异常，错误码443',
        444: '操作异常，错误码444',
        445: '操作异常，错误码445',
        446: '操作异常，错误码446',
        447: '操作异常，错误码447',
        448: '操作异常，错误码448',
        449: '操作异常，错误码449',
        450: '操作异常，错误码450',
        451: '操作异常，错误码451',
        452: '操作异常，错误码452',
        458: '操作异常，错误码458',
        456: '设备已处于对讲状态或不支持对讲',
        6001: '录像失败'
    },
    //操作异常错误码,做浮窗提示显示
    FAILED_CODE: {
        1001: '账号或密码错误',
        1002: '该帐号已连接',
        1004: '没有鉴权',
        2001: '未携带token或token错误',
        2002: '视频源id不存在',
        2003: '操作指令非法(该账号不允许执行这个指令，或者不支持该指令)',
        3001: 'nat通道未建立',
        3002: '该视频流已在传输',
        3003: '无法获取远端视频流',
        4001: '视频流异常断开连接',
        // 4002: '获取视频失败',
        5000: '内部错误',
        8001: '该设备不支持云台操作',
        453: 'videoServer连接失败',
        454: '录像回放窗口已占用，请先停止播放',
        455: '无视频录像，操作失败',
        5001: '呼叫异常断开',
        5002: '禁止修改分辨率',
        5003: '窗口编号越界',
        5004: '窗口占用踢出',
        5005: '认证超时',
        5006: '打开视频超时',
        5007: '获取H265视频流超时',
        5008: '视频未打开不能打开音频',
        5009: '音频未打开，不能关闭音频',
        401: '禁止修改分辨率',
        4002: '视频源正常断开',
        4003: '音频重置',
        4004: '音频被占用',
        4005: '客户端已打开对讲',
        4006: '终端离开云眼音频',
        4008: '终端拒绝打开视频',
        4010: '云眼播放时间达到配置限制最长时间',
        4011:'切换分辨率失败(终端不支持)',
        4012:'切换前后摄像头失败',
        6001: '录像失败',
        499: '内部创建失败',
        440: '请求消息内容为空',
        441: 'json格式错误',
        442: '无效的请求',
        443: '消息内容缺失',
        444: '消息缺少参数',
        445: '账户已登陆',
        446: '收到的videoserver消息有误',
        447: '消息参数错误',
        448: 'SDP创建失败',
        449: '未使用',
        450: '创建端口失败',
        451: 'SDP创建失败',
        452: '未使用加密的RTP',
        456: '对讲未打开',
        7000: 'URL账号密码错误（RTSP）',
        7001: 'URL地址不通（RTSP）',
        7002: 'URL格式错误（RTSP）'
    },

    /**
     * 以下的错误状态不会关闭视频
     */
    STATUS_CODE_ARR: [
        '5002',
        '401',
        '4003',
        '4004',
        '5009',
        "5008",
        '4005',
        '4006',
        '8001',
        '6001',
        '4011',
        '4012'
    ]
};

export default CONST_CODE;
