import { ScooperVideoEvent } from "../scooperVideo.d";

/** 事件处理函数 */
type EventHandler = Function & { hashCode?: string };

/**
 * 事件派发器
 */
export default class Listener {
    _listeners: { [type: string]: { [key: string]: EventHandler } } = {};

    /**
     * 添加事件
     * @param type 
     * @param handler 
     * @param key 
     * @returns 
     */
    addListener(type: string, handler: Function, key?: string) {
        if (typeof handler != 'function') {
            return;
        }
        let t = this._listeners;
        let id: string | undefined;
        if (typeof key == "string" && key) {
            if (/[^\w\-]/.test(key)) {
                throw("nonstandard key:" + key);
            } else {
                (handler as EventHandler).hashCode = key; 
                id = key;
            }
        }
        type.indexOf("on") != 0 && (type = "on" + type);
        typeof t[type] != "object" && (t[type] = {});
        id = id || guid();
        (handler as EventHandler).hashCode = id;
        t[type][id] = handler as EventHandler;
    }

    /**
     * 删除事件
     */
    removeListener(type: string, handler: Function) {
        type.indexOf("on") != 0 && (type = "on" + type);
        let t = this._listeners;
        if (!t[type]) {
            return;
        }
        if (handler) {
            let key: string | undefined;
            if (typeof handler == 'function') {
                key = (handler as EventHandler).hashCode;
            }
            if (typeof key != "string"){
                return;
            }
            t[type][key] && delete t[type][key];
        } else {
            t[type] = {};
        }
    }

    /**
     * 派发事件
     */
    dispatch(e: ScooperVideoEvent | EventObject, options: any) {
        if (typeof e == 'string') {
            e = new EventObject(e);
        }
        options = options || {};
        for (let i in options) {
            (e as any)[i] = options[i];
        }
        let t = this._listeners, p = e.type;
        e.target || (e.target = this);
        e.currentTarget = this;
        p.indexOf("on") != 0 && (p = "on" + p);
        // typeof this[p] == 'function' && this[p].apply(this, arguments);
        if (typeof t[p] == "object") {
            for (let i in t[p]) {
                t[p][i].call(this, e);
            }
        }
        return e.returnValue;
    }
    /**
         * 清空事件
         */
    removeAllListeners () {
        this._listeners = {};
    }
}

/**
 * 为事件生成唯一标识字符串
 */
const guid = (function() {
    let id = 1;
    return function() {
        return 'SCSH_ID_'+ (++id).toString();
    }
})();

/**
 * 事件对象包装类，通过事件type，加载必要的属性
 */
class EventObject {
    returnValue: boolean = true;
    currentTarget: any;

    constructor(
        public type: string,
        public target: any = null,
    ) { }
}
