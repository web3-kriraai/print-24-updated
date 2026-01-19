const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/quill-CUWLWnBc.js","assets/index-CWNmoqdY.js","assets/index-XpILbJAL.css"])))=>i.map(i=>d[i]);
import{R as Ne,r as q,_ as _e}from"./index-CWNmoqdY.js";var Fe={};function Le(r){if(Array.isArray(r))return r}function Ie(r,t){var e=r==null?null:typeof Symbol<"u"&&r[Symbol.iterator]||r["@@iterator"];if(e!=null){var n,l,o,i,a=[],s=!0,u=!1;try{if(o=(e=e.call(r)).next,t!==0)for(;!(s=(n=o.call(e)).done)&&(a.push(n.value),a.length!==t);s=!0);}catch(c){u=!0,l=c}finally{try{if(!s&&e.return!=null&&(i=e.return(),Object(i)!==i))return}finally{if(u)throw l}}return a}}function ie(r,t){(t==null||t>r.length)&&(t=r.length);for(var e=0,n=Array(t);e<t;e++)n[e]=r[e];return n}function Ee(r,t){if(r){if(typeof r=="string")return ie(r,t);var e={}.toString.call(r).slice(8,-1);return e==="Object"&&r.constructor&&(e=r.constructor.name),e==="Map"||e==="Set"?Array.from(r):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?ie(r,t):void 0}}function je(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function J(r,t){return Le(r)||Ie(r,t)||Ee(r,t)||je()}function E(r){"@babel/helpers - typeof";return E=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},E(r)}function ee(){for(var r=arguments.length,t=new Array(r),e=0;e<r;e++)t[e]=arguments[e];if(t){for(var n=[],l=0;l<t.length;l++){var o=t[l];if(o){var i=E(o);if(i==="string"||i==="number")n.push(o);else if(i==="object"){var a=Array.isArray(o)?o:Object.entries(o).map(function(s){var u=J(s,2),c=u[0],p=u[1];return p?c:null});n=a.length?n.concat(a.filter(function(s){return!!s})):n}}}return n.join(" ").trim()}}function He(r){if(Array.isArray(r))return ie(r)}function Re(r){if(typeof Symbol<"u"&&r[Symbol.iterator]!=null||r["@@iterator"]!=null)return Array.from(r)}function We(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function ae(r){return He(r)||Re(r)||Ee(r)||We()}function Se(r,t){if(!(r instanceof t))throw new TypeError("Cannot call a class as a function")}function De(r,t){if(E(r)!="object"||!r)return r;var e=r[Symbol.toPrimitive];if(e!==void 0){var n=e.call(r,t);if(E(n)!="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(r)}function Ce(r){var t=De(r,"string");return E(t)=="symbol"?t:t+""}function $e(r,t){for(var e=0;e<t.length;e++){var n=t[e];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(r,Ce(n.key),n)}}function Te(r,t,e){return e&&$e(r,e),Object.defineProperty(r,"prototype",{writable:!1}),r}function de(r,t,e){return(t=Ce(t))in r?Object.defineProperty(r,t,{value:e,enumerable:!0,configurable:!0,writable:!0}):r[t]=e,r}function oe(r,t){var e=typeof Symbol<"u"&&r[Symbol.iterator]||r["@@iterator"];if(!e){if(Array.isArray(r)||(e=ze(r))||t){e&&(r=e);var n=0,l=function(){};return{s:l,n:function(){return n>=r.length?{done:!0}:{done:!1,value:r[n++]}},e:function(u){throw u},f:l}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var o,i=!0,a=!1;return{s:function(){e=e.call(r)},n:function(){var u=e.next();return i=u.done,u},e:function(u){a=!0,o=u},f:function(){try{i||e.return==null||e.return()}finally{if(a)throw o}}}}function ze(r,t){if(r){if(typeof r=="string")return pe(r,t);var e={}.toString.call(r).slice(8,-1);return e==="Object"&&r.constructor&&(e=r.constructor.name),e==="Map"||e==="Set"?Array.from(r):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?pe(r,t):void 0}}function pe(r,t){(t==null||t>r.length)&&(t=r.length);for(var e=0,n=Array(t);e<t;e++)n[e]=r[e];return n}var M=(function(){function r(){Se(this,r)}return Te(r,null,[{key:"innerWidth",value:function(e){if(e){var n=e.offsetWidth,l=getComputedStyle(e);return n=n+(parseFloat(l.paddingLeft)+parseFloat(l.paddingRight)),n}return 0}},{key:"width",value:function(e){if(e){var n=e.offsetWidth,l=getComputedStyle(e);return n=n-(parseFloat(l.paddingLeft)+parseFloat(l.paddingRight)),n}return 0}},{key:"getBrowserLanguage",value:function(){return navigator.userLanguage||navigator.languages&&navigator.languages.length&&navigator.languages[0]||navigator.language||navigator.browserLanguage||navigator.systemLanguage||"en"}},{key:"getWindowScrollTop",value:function(){var e=document.documentElement;return(window.pageYOffset||e.scrollTop)-(e.clientTop||0)}},{key:"getWindowScrollLeft",value:function(){var e=document.documentElement;return(window.pageXOffset||e.scrollLeft)-(e.clientLeft||0)}},{key:"getOuterWidth",value:function(e,n){if(e){var l=e.getBoundingClientRect().width||e.offsetWidth;if(n){var o=getComputedStyle(e);l=l+(parseFloat(o.marginLeft)+parseFloat(o.marginRight))}return l}return 0}},{key:"getOuterHeight",value:function(e,n){if(e){var l=e.getBoundingClientRect().height||e.offsetHeight;if(n){var o=getComputedStyle(e);l=l+(parseFloat(o.marginTop)+parseFloat(o.marginBottom))}return l}return 0}},{key:"getClientHeight",value:function(e,n){if(e){var l=e.clientHeight;if(n){var o=getComputedStyle(e);l=l+(parseFloat(o.marginTop)+parseFloat(o.marginBottom))}return l}return 0}},{key:"getClientWidth",value:function(e,n){if(e){var l=e.clientWidth;if(n){var o=getComputedStyle(e);l=l+(parseFloat(o.marginLeft)+parseFloat(o.marginRight))}return l}return 0}},{key:"getViewport",value:function(){var e=window,n=document,l=n.documentElement,o=n.getElementsByTagName("body")[0],i=e.innerWidth||l.clientWidth||o.clientWidth,a=e.innerHeight||l.clientHeight||o.clientHeight;return{width:i,height:a}}},{key:"getOffset",value:function(e){if(e){var n=e.getBoundingClientRect();return{top:n.top+(window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0),left:n.left+(window.pageXOffset||document.documentElement.scrollLeft||document.body.scrollLeft||0)}}return{top:"auto",left:"auto"}}},{key:"index",value:function(e){if(e)for(var n=e.parentNode.childNodes,l=0,o=0;o<n.length;o++){if(n[o]===e)return l;n[o].nodeType===1&&l++}return-1}},{key:"addMultipleClasses",value:function(e,n){if(e&&n)if(e.classList)for(var l=n.split(" "),o=0;o<l.length;o++)e.classList.add(l[o]);else for(var i=n.split(" "),a=0;a<i.length;a++)e.className=e.className+(" "+i[a])}},{key:"removeMultipleClasses",value:function(e,n){if(e&&n)if(e.classList)for(var l=n.split(" "),o=0;o<l.length;o++)e.classList.remove(l[o]);else for(var i=n.split(" "),a=0;a<i.length;a++)e.className=e.className.replace(new RegExp("(^|\\b)"+i[a].split(" ").join("|")+"(\\b|$)","gi")," ")}},{key:"addClass",value:function(e,n){e&&n&&(e.classList?e.classList.add(n):e.className=e.className+(" "+n))}},{key:"removeClass",value:function(e,n){e&&n&&(e.classList?e.classList.remove(n):e.className=e.className.replace(new RegExp("(^|\\b)"+n.split(" ").join("|")+"(\\b|$)","gi")," "))}},{key:"hasClass",value:function(e,n){return e?e.classList?e.classList.contains(n):new RegExp("(^| )"+n+"( |$)","gi").test(e.className):!1}},{key:"addStyles",value:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};e&&Object.entries(n).forEach(function(l){var o=J(l,2),i=o[0],a=o[1];return e.style[i]=a})}},{key:"find",value:function(e,n){return e?Array.from(e.querySelectorAll(n)):[]}},{key:"findSingle",value:function(e,n){return e?e.querySelector(n):null}},{key:"setAttributes",value:function(e){var n=this,l=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};if(e){var o=function(a,s){var u,c,p=e!=null&&(u=e.$attrs)!==null&&u!==void 0&&u[a]?[e==null||(c=e.$attrs)===null||c===void 0?void 0:c[a]]:[];return[s].flat().reduce(function(f,d){if(d!=null){var h=E(d);if(h==="string"||h==="number")f.push(d);else if(h==="object"){var v=Array.isArray(d)?o(a,d):Object.entries(d).map(function(y){var g=J(y,2),m=g[0],b=g[1];return a==="style"&&(b||b===0)?"".concat(m.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase(),":").concat(b):b?m:void 0});f=v.length?f.concat(v.filter(function(y){return!!y})):f}}return f},p)};Object.entries(l).forEach(function(i){var a=J(i,2),s=a[0],u=a[1];if(u!=null){var c=s.match(/^on(.+)/);c?e.addEventListener(c[1].toLowerCase(),u):s==="p-bind"?n.setAttributes(e,u):(u=s==="class"?ae(new Set(o("class",u))).join(" ").trim():s==="style"?o("style",u).join(";").trim():u,(e.$attrs=e.$attrs||{})&&(e.$attrs[s]=u),e.setAttribute(s,u))}})}}},{key:"getAttribute",value:function(e,n){if(e){var l=e.getAttribute(n);return isNaN(l)?l==="true"||l==="false"?l==="true":l:+l}}},{key:"isAttributeEquals",value:function(e,n,l){return e?this.getAttribute(e,n)===l:!1}},{key:"isAttributeNotEquals",value:function(e,n,l){return!this.isAttributeEquals(e,n,l)}},{key:"getHeight",value:function(e){if(e){var n=e.offsetHeight,l=getComputedStyle(e);return n=n-(parseFloat(l.paddingTop)+parseFloat(l.paddingBottom)+parseFloat(l.borderTopWidth)+parseFloat(l.borderBottomWidth)),n}return 0}},{key:"getWidth",value:function(e){if(e){var n=e.offsetWidth,l=getComputedStyle(e);return n=n-(parseFloat(l.paddingLeft)+parseFloat(l.paddingRight)+parseFloat(l.borderLeftWidth)+parseFloat(l.borderRightWidth)),n}return 0}},{key:"alignOverlay",value:function(e,n,l){var o=arguments.length>3&&arguments[3]!==void 0?arguments[3]:!0;e&&n&&(l==="self"?this.relativePosition(e,n):(o&&(e.style.minWidth=r.getOuterWidth(n)+"px"),this.absolutePosition(e,n)))}},{key:"absolutePosition",value:function(e,n){var l=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"left";if(e&&n){var o=e.offsetParent?{width:e.offsetWidth,height:e.offsetHeight}:this.getHiddenElementDimensions(e),i=o.height,a=o.width,s=n.offsetHeight,u=n.offsetWidth,c=n.getBoundingClientRect(),p=this.getWindowScrollTop(),f=this.getWindowScrollLeft(),d=this.getViewport(),h,v;c.top+s+i>d.height?(h=c.top+p-i,h<0&&(h=p),e.style.transformOrigin="bottom"):(h=s+c.top+p,e.style.transformOrigin="top");var y=c.left;l==="left"?y+a>d.width?v=Math.max(0,y+f+u-a):v=y+f:y+u-a<0?v=f:v=y+u-a+f,e.style.top=h+"px",e.style.left=v+"px"}}},{key:"relativePosition",value:function(e,n){if(e&&n){var l=e.offsetParent?{width:e.offsetWidth,height:e.offsetHeight}:this.getHiddenElementDimensions(e),o=n.offsetHeight,i=n.getBoundingClientRect(),a=this.getViewport(),s,u;i.top+o+l.height>a.height?(s=-1*l.height,i.top+s<0&&(s=-1*i.top),e.style.transformOrigin="bottom"):(s=o,e.style.transformOrigin="top"),l.width>a.width?u=i.left*-1:i.left+l.width>a.width?u=(i.left+l.width-a.width)*-1:u=0,e.style.top=s+"px",e.style.left=u+"px"}}},{key:"flipfitCollision",value:function(e,n){var l=this,o=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"left top",i=arguments.length>3&&arguments[3]!==void 0?arguments[3]:"left bottom",a=arguments.length>4?arguments[4]:void 0;if(e&&n){var s=n.getBoundingClientRect(),u=this.getViewport(),c=o.split(" "),p=i.split(" "),f=function(g,m){return m?+g.substring(g.search(/(\+|-)/g))||0:g.substring(0,g.search(/(\+|-)/g))||g},d={my:{x:f(c[0]),y:f(c[1]||c[0]),offsetX:f(c[0],!0),offsetY:f(c[1]||c[0],!0)},at:{x:f(p[0]),y:f(p[1]||p[0]),offsetX:f(p[0],!0),offsetY:f(p[1]||p[0],!0)}},h={left:function(){var g=d.my.offsetX+d.at.offsetX;return g+s.left+(d.my.x==="left"?0:-1*(d.my.x==="center"?l.getOuterWidth(e)/2:l.getOuterWidth(e)))},top:function(){var g=d.my.offsetY+d.at.offsetY;return g+s.top+(d.my.y==="top"?0:-1*(d.my.y==="center"?l.getOuterHeight(e)/2:l.getOuterHeight(e)))}},v={count:{x:0,y:0},left:function(){var g=h.left(),m=r.getWindowScrollLeft();e.style.left=g+m+"px",this.count.x===2?(e.style.left=m+"px",this.count.x=0):g<0&&(this.count.x++,d.my.x="left",d.at.x="right",d.my.offsetX*=-1,d.at.offsetX*=-1,this.right())},right:function(){var g=h.left()+r.getOuterWidth(n),m=r.getWindowScrollLeft();e.style.left=g+m+"px",this.count.x===2?(e.style.left=u.width-r.getOuterWidth(e)+m+"px",this.count.x=0):g+r.getOuterWidth(e)>u.width&&(this.count.x++,d.my.x="right",d.at.x="left",d.my.offsetX*=-1,d.at.offsetX*=-1,this.left())},top:function(){var g=h.top(),m=r.getWindowScrollTop();e.style.top=g+m+"px",this.count.y===2?(e.style.left=m+"px",this.count.y=0):g<0&&(this.count.y++,d.my.y="top",d.at.y="bottom",d.my.offsetY*=-1,d.at.offsetY*=-1,this.bottom())},bottom:function(){var g=h.top()+r.getOuterHeight(n),m=r.getWindowScrollTop();e.style.top=g+m+"px",this.count.y===2?(e.style.left=u.height-r.getOuterHeight(e)+m+"px",this.count.y=0):g+r.getOuterHeight(n)>u.height&&(this.count.y++,d.my.y="bottom",d.at.y="top",d.my.offsetY*=-1,d.at.offsetY*=-1,this.top())},center:function(g){if(g==="y"){var m=h.top()+r.getOuterHeight(n)/2;e.style.top=m+r.getWindowScrollTop()+"px",m<0?this.bottom():m+r.getOuterHeight(n)>u.height&&this.top()}else{var b=h.left()+r.getOuterWidth(n)/2;e.style.left=b+r.getWindowScrollLeft()+"px",b<0?this.left():b+r.getOuterWidth(e)>u.width&&this.right()}}};v[d.at.x]("x"),v[d.at.y]("y"),this.isFunction(a)&&a(d)}}},{key:"findCollisionPosition",value:function(e){if(e){var n=e==="top"||e==="bottom",l=e==="left"?"right":"left",o=e==="top"?"bottom":"top";return n?{axis:"y",my:"center ".concat(o),at:"center ".concat(e)}:{axis:"x",my:"".concat(l," center"),at:"".concat(e," center")}}}},{key:"getParents",value:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:[];return e.parentNode===null?n:this.getParents(e.parentNode,n.concat([e.parentNode]))}},{key:"getScrollableParents",value:function(e){var n=this,l=[];if(e){var o=this.getParents(e),i=/(auto|scroll)/,a=function(k){var T=k?getComputedStyle(k):null;return T&&(i.test(T.getPropertyValue("overflow"))||i.test(T.getPropertyValue("overflow-x"))||i.test(T.getPropertyValue("overflow-y")))},s=function(k){l.push(k.nodeName==="BODY"||k.nodeName==="HTML"||n.isDocument(k)?window:k)},u=oe(o),c;try{for(u.s();!(c=u.n()).done;){var p,f=c.value,d=f.nodeType===1&&((p=f.dataset)===null||p===void 0?void 0:p.scrollselectors);if(d){var h=d.split(","),v=oe(h),y;try{for(v.s();!(y=v.n()).done;){var g=y.value,m=this.findSingle(f,g);m&&a(m)&&s(m)}}catch(b){v.e(b)}finally{v.f()}}f.nodeType===1&&a(f)&&s(f)}}catch(b){u.e(b)}finally{u.f()}}return l}},{key:"getHiddenElementOuterHeight",value:function(e){if(e){e.style.visibility="hidden",e.style.display="block";var n=e.offsetHeight;return e.style.display="none",e.style.visibility="visible",n}return 0}},{key:"getHiddenElementOuterWidth",value:function(e){if(e){e.style.visibility="hidden",e.style.display="block";var n=e.offsetWidth;return e.style.display="none",e.style.visibility="visible",n}return 0}},{key:"getHiddenElementDimensions",value:function(e){var n={};return e&&(e.style.visibility="hidden",e.style.display="block",n.width=e.offsetWidth,n.height=e.offsetHeight,e.style.display="none",e.style.visibility="visible"),n}},{key:"fadeIn",value:function(e,n){if(e){e.style.opacity=0;var l=+new Date,o=0,i=function(){o=+e.style.opacity+(new Date().getTime()-l)/n,e.style.opacity=o,l=+new Date,+o<1&&(window.requestAnimationFrame&&requestAnimationFrame(i)||setTimeout(i,16))};i()}}},{key:"fadeOut",value:function(e,n){if(e)var l=1,o=50,i=o/n,a=setInterval(function(){l=l-i,l<=0&&(l=0,clearInterval(a)),e.style.opacity=l},o)}},{key:"getUserAgent",value:function(){return navigator.userAgent}},{key:"isIOS",value:function(){return/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream}},{key:"isAndroid",value:function(){return/(android)/i.test(navigator.userAgent)}},{key:"isChrome",value:function(){return/(chrome)/i.test(navigator.userAgent)}},{key:"isClient",value:function(){return!!(typeof window<"u"&&window.document&&window.document.createElement)}},{key:"isTouchDevice",value:function(){return"ontouchstart"in window||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0}},{key:"isFunction",value:function(e){return!!(e&&e.constructor&&e.call&&e.apply)}},{key:"appendChild",value:function(e,n){if(this.isElement(n))n.appendChild(e);else if(n.el&&n.el.nativeElement)n.el.nativeElement.appendChild(e);else throw new Error("Cannot append "+n+" to "+e)}},{key:"removeChild",value:function(e,n){if(this.isElement(n))n.removeChild(e);else if(n.el&&n.el.nativeElement)n.el.nativeElement.removeChild(e);else throw new Error("Cannot remove "+e+" from "+n)}},{key:"isElement",value:function(e){return(typeof HTMLElement>"u"?"undefined":E(HTMLElement))==="object"?e instanceof HTMLElement:e&&E(e)==="object"&&e!==null&&e.nodeType===1&&typeof e.nodeName=="string"}},{key:"isDocument",value:function(e){return(typeof Document>"u"?"undefined":E(Document))==="object"?e instanceof Document:e&&E(e)==="object"&&e!==null&&e.nodeType===9}},{key:"scrollInView",value:function(e,n){var l=getComputedStyle(e).getPropertyValue("border-top-width"),o=l?parseFloat(l):0,i=getComputedStyle(e).getPropertyValue("padding-top"),a=i?parseFloat(i):0,s=e.getBoundingClientRect(),u=n.getBoundingClientRect(),c=u.top+document.body.scrollTop-(s.top+document.body.scrollTop)-o-a,p=e.scrollTop,f=e.clientHeight,d=this.getOuterHeight(n);c<0?e.scrollTop=p+c:c+d>f&&(e.scrollTop=p+c-f+d)}},{key:"clearSelection",value:function(){if(window.getSelection)window.getSelection().empty?window.getSelection().empty():window.getSelection().removeAllRanges&&window.getSelection().rangeCount>0&&window.getSelection().getRangeAt(0).getClientRects().length>0&&window.getSelection().removeAllRanges();else if(document.selection&&document.selection.empty)try{document.selection.empty()}catch{}}},{key:"calculateScrollbarWidth",value:function(e){if(e){var n=getComputedStyle(e);return e.offsetWidth-e.clientWidth-parseFloat(n.borderLeftWidth)-parseFloat(n.borderRightWidth)}if(this.calculatedScrollbarWidth!=null)return this.calculatedScrollbarWidth;var l=document.createElement("div");l.className="p-scrollbar-measure",document.body.appendChild(l);var o=l.offsetWidth-l.clientWidth;return document.body.removeChild(l),this.calculatedScrollbarWidth=o,o}},{key:"calculateBodyScrollbarWidth",value:function(){return window.innerWidth-document.documentElement.offsetWidth}},{key:"getBrowser",value:function(){if(!this.browser){var e=this.resolveUserAgent();this.browser={},e.browser&&(this.browser[e.browser]=!0,this.browser.version=e.version),this.browser.chrome?this.browser.webkit=!0:this.browser.webkit&&(this.browser.safari=!0)}return this.browser}},{key:"resolveUserAgent",value:function(){var e=navigator.userAgent.toLowerCase(),n=/(chrome)[ ]([\w.]+)/.exec(e)||/(webkit)[ ]([\w.]+)/.exec(e)||/(opera)(?:.*version|)[ ]([\w.]+)/.exec(e)||/(msie) ([\w.]+)/.exec(e)||e.indexOf("compatible")<0&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(e)||[];return{browser:n[1]||"",version:n[2]||"0"}}},{key:"blockBodyScroll",value:function(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:"p-overflow-hidden",n=!!document.body.style.getPropertyValue("--scrollbar-width");!n&&document.body.style.setProperty("--scrollbar-width",this.calculateBodyScrollbarWidth()+"px"),this.addClass(document.body,e)}},{key:"unblockBodyScroll",value:function(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:"p-overflow-hidden";document.body.style.removeProperty("--scrollbar-width"),this.removeClass(document.body,e)}},{key:"isVisible",value:function(e){return e&&(e.clientHeight!==0||e.getClientRects().length!==0||getComputedStyle(e).display!=="none")}},{key:"isExist",value:function(e){return!!(e!==null&&typeof e<"u"&&e.nodeName&&e.parentNode)}},{key:"getFocusableElements",value:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"",l=r.find(e,'button:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])'.concat(n,`,
                [href][clientHeight][clientWidth]:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])`).concat(n,`,
                input:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])`).concat(n,`,
                select:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])`).concat(n,`,
                textarea:not([tabindex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])`).concat(n,`,
                [tabIndex]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])`).concat(n,`,
                [contenteditable]:not([tabIndex = "-1"]):not([disabled]):not([style*="display:none"]):not([hidden])`).concat(n)),o=[],i=oe(l),a;try{for(i.s();!(a=i.n()).done;){var s=a.value;getComputedStyle(s).display!=="none"&&getComputedStyle(s).visibility!=="hidden"&&o.push(s)}}catch(u){i.e(u)}finally{i.f()}return o}},{key:"getFirstFocusableElement",value:function(e,n){var l=r.getFocusableElements(e,n);return l.length>0?l[0]:null}},{key:"getLastFocusableElement",value:function(e,n){var l=r.getFocusableElements(e,n);return l.length>0?l[l.length-1]:null}},{key:"focus",value:function(e,n){var l=n===void 0?!0:!n;e&&document.activeElement!==e&&e.focus({preventScroll:l})}},{key:"focusFirstElement",value:function(e,n){if(e){var l=r.getFirstFocusableElement(e);return l&&r.focus(l,n),l}}},{key:"getCursorOffset",value:function(e,n,l,o){if(e){var i=getComputedStyle(e),a=document.createElement("div");a.style.position="absolute",a.style.top="0px",a.style.left="0px",a.style.visibility="hidden",a.style.pointerEvents="none",a.style.overflow=i.overflow,a.style.width=i.width,a.style.height=i.height,a.style.padding=i.padding,a.style.border=i.border,a.style.overflowWrap=i.overflowWrap,a.style.whiteSpace=i.whiteSpace,a.style.lineHeight=i.lineHeight,a.innerHTML=n.replace(/\r\n|\r|\n/g,"<br />");var s=document.createElement("span");s.textContent=o,a.appendChild(s);var u=document.createTextNode(l);a.appendChild(u),document.body.appendChild(a);var c=s.offsetLeft,p=s.offsetTop,f=s.clientHeight;return document.body.removeChild(a),{left:Math.abs(c-e.scrollLeft),top:Math.abs(p-e.scrollTop)+f}}return{top:"auto",left:"auto"}}},{key:"invokeElementMethod",value:function(e,n,l){e[n].apply(e,l)}},{key:"isClickable",value:function(e){var n=e.nodeName,l=e.parentElement&&e.parentElement.nodeName;return n==="INPUT"||n==="TEXTAREA"||n==="BUTTON"||n==="A"||l==="INPUT"||l==="TEXTAREA"||l==="BUTTON"||l==="A"||this.hasClass(e,"p-button")||this.hasClass(e.parentElement,"p-button")||this.hasClass(e.parentElement,"p-checkbox")||this.hasClass(e.parentElement,"p-radiobutton")}},{key:"applyStyle",value:function(e,n){if(typeof n=="string")e.style.cssText=n;else for(var l in n)e.style[l]=n[l]}},{key:"exportCSV",value:function(e,n){var l=new Blob([e],{type:"application/csv;charset=utf-8;"});if(window.navigator.msSaveOrOpenBlob)navigator.msSaveOrOpenBlob(l,n+".csv");else{var o=r.saveAs({name:n+".csv",src:URL.createObjectURL(l)});o||(e="data:text/csv;charset=utf-8,"+e,window.open(encodeURI(e)))}}},{key:"saveAs",value:function(e){if(e){var n=document.createElement("a");if(n.download!==void 0){var l=e.name,o=e.src;return n.setAttribute("href",o),n.setAttribute("download",l),n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n),!0}}return!1}},{key:"createInlineStyle",value:function(e,n){var l=document.createElement("style");return r.addNonce(l,e),n||(n=document.head),n.appendChild(l),l}},{key:"removeInlineStyle",value:function(e){if(this.isExist(e)){try{e.parentNode.removeChild(e)}catch{}e=null}return e}},{key:"addNonce",value:function(e,n){try{n||(n=Fe.REACT_APP_CSS_NONCE)}catch{}n&&e.setAttribute("nonce",n)}},{key:"getTargetElement",value:function(e){if(!e)return null;if(e==="document")return document;if(e==="window")return window;if(E(e)==="object"&&e.hasOwnProperty("current"))return this.isExist(e.current)?e.current:null;var n=function(i){return!!(i&&i.constructor&&i.call&&i.apply)},l=n(e)?e():e;return this.isDocument(l)||this.isExist(l)?l:null}},{key:"getAttributeNames",value:function(e){var n,l,o;for(l=[],o=e.attributes,n=0;n<o.length;++n)l.push(o[n].nodeName);return l.sort(),l}},{key:"isEqualElement",value:function(e,n){var l,o,i,a,s;if(l=r.getAttributeNames(e),o=r.getAttributeNames(n),l.join(",")!==o.join(","))return!1;for(var u=0;u<l.length;++u)if(i=l[u],i==="style")for(var c=e.style,p=n.style,f=/^\d+$/,d=0,h=Object.keys(c);d<h.length;d++){var v=h[d];if(!f.test(v)&&c[v]!==p[v])return!1}else if(e.getAttribute(i)!==n.getAttribute(i))return!1;for(a=e.firstChild,s=n.firstChild;a&&s;a=a.nextSibling,s=s.nextSibling){if(a.nodeType!==s.nodeType)return!1;if(a.nodeType===1){if(!r.isEqualElement(a,s))return!1}else if(a.nodeValue!==s.nodeValue)return!1}return!(a||s)}},{key:"hasCSSAnimation",value:function(e){if(e){var n=getComputedStyle(e),l=parseFloat(n.getPropertyValue("animation-duration")||"0");return l>0}return!1}},{key:"hasCSSTransition",value:function(e){if(e){var n=getComputedStyle(e),l=parseFloat(n.getPropertyValue("transition-duration")||"0");return l>0}return!1}}])})();de(M,"DATA_PROPS",["data-"]);de(M,"ARIA_PROPS",["aria","focus-target"]);function qe(r,t){var e=typeof Symbol<"u"&&r[Symbol.iterator]||r["@@iterator"];if(!e){if(Array.isArray(r)||(e=Me(r))||t){e&&(r=e);var n=0,l=function(){};return{s:l,n:function(){return n>=r.length?{done:!0}:{done:!1,value:r[n++]}},e:function(u){throw u},f:l}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var o,i=!0,a=!1;return{s:function(){e=e.call(r)},n:function(){var u=e.next();return i=u.done,u},e:function(u){a=!0,o=u},f:function(){try{i||e.return==null||e.return()}finally{if(a)throw o}}}}function Me(r,t){if(r){if(typeof r=="string")return ge(r,t);var e={}.toString.call(r).slice(8,-1);return e==="Object"&&r.constructor&&(e=r.constructor.name),e==="Map"||e==="Set"?Array.from(r):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?ge(r,t):void 0}}function ge(r,t){(t==null||t>r.length)&&(t=r.length);for(var e=0,n=Array(t);e<t;e++)n[e]=r[e];return n}var S=(function(){function r(){Se(this,r)}return Te(r,null,[{key:"equals",value:function(e,n,l){return l&&e&&E(e)==="object"&&n&&E(n)==="object"?this.deepEquals(this.resolveFieldData(e,l),this.resolveFieldData(n,l)):this.deepEquals(e,n)}},{key:"deepEquals",value:function(e,n){if(e===n)return!0;if(e&&n&&E(e)==="object"&&E(n)==="object"){var l=Array.isArray(e),o=Array.isArray(n),i,a,s;if(l&&o){if(a=e.length,a!==n.length)return!1;for(i=a;i--!==0;)if(!this.deepEquals(e[i],n[i]))return!1;return!0}if(l!==o)return!1;var u=e instanceof Date,c=n instanceof Date;if(u!==c)return!1;if(u&&c)return e.getTime()===n.getTime();var p=e instanceof RegExp,f=n instanceof RegExp;if(p!==f)return!1;if(p&&f)return e.toString()===n.toString();var d=Object.keys(e);if(a=d.length,a!==Object.keys(n).length)return!1;for(i=a;i--!==0;)if(!Object.prototype.hasOwnProperty.call(n,d[i]))return!1;for(i=a;i--!==0;)if(s=d[i],!this.deepEquals(e[s],n[s]))return!1;return!0}return e!==e&&n!==n}},{key:"resolveFieldData",value:function(e,n){if(!e||!n)return null;try{var l=e[n];if(this.isNotEmpty(l))return l}catch{}if(Object.keys(e).length){if(this.isFunction(n))return n(e);if(this.isNotEmpty(e[n]))return e[n];if(n.indexOf(".")===-1)return e[n];for(var o=n.split("."),i=e,a=0,s=o.length;a<s;++a){if(i==null)return null;i=i[o[a]]}return i}return null}},{key:"findDiffKeys",value:function(e,n){return!e||!n?{}:Object.keys(e).filter(function(l){return!n.hasOwnProperty(l)}).reduce(function(l,o){return l[o]=e[o],l},{})}},{key:"reduceKeys",value:function(e,n){var l={};return!e||!n||n.length===0||Object.keys(e).filter(function(o){return n.some(function(i){return o.startsWith(i)})}).forEach(function(o){l[o]=e[o],delete e[o]}),l}},{key:"reorderArray",value:function(e,n,l){e&&n!==l&&(l>=e.length&&(l=l%e.length,n=n%e.length),e.splice(l,0,e.splice(n,1)[0]))}},{key:"findIndexInList",value:function(e,n,l){var o=this;return n?l?n.findIndex(function(i){return o.equals(i,e,l)}):n.findIndex(function(i){return i===e}):-1}},{key:"getJSXElement",value:function(e){for(var n=arguments.length,l=new Array(n>1?n-1:0),o=1;o<n;o++)l[o-1]=arguments[o];return this.isFunction(e)?e.apply(void 0,l):e}},{key:"getItemValue",value:function(e){for(var n=arguments.length,l=new Array(n>1?n-1:0),o=1;o<n;o++)l[o-1]=arguments[o];return this.isFunction(e)?e.apply(void 0,l):e}},{key:"getProp",value:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"",l=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},o=e?e[n]:void 0;return o===void 0?l[n]:o}},{key:"getPropCaseInsensitive",value:function(e,n){var l=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},o=this.toFlatCase(n);for(var i in e)if(e.hasOwnProperty(i)&&this.toFlatCase(i)===o)return e[i];for(var a in l)if(l.hasOwnProperty(a)&&this.toFlatCase(a)===o)return l[a]}},{key:"getMergedProps",value:function(e,n){return Object.assign({},n,e)}},{key:"getDiffProps",value:function(e,n){return this.findDiffKeys(e,n)}},{key:"getPropValue",value:function(e){if(!this.isFunction(e))return e;for(var n=arguments.length,l=new Array(n>1?n-1:0),o=1;o<n;o++)l[o-1]=arguments[o];if(l.length===1){var i=l[0];return e(Array.isArray(i)?i[0]:i)}return e.apply(void 0,l)}},{key:"getComponentProp",value:function(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"",l=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};return this.isNotEmpty(e)?this.getProp(e.props,n,l):void 0}},{key:"getComponentProps",value:function(e,n){return this.isNotEmpty(e)?this.getMergedProps(e.props,n):void 0}},{key:"getComponentDiffProps",value:function(e,n){return this.isNotEmpty(e)?this.getDiffProps(e.props,n):void 0}},{key:"isValidChild",value:function(e,n,l){if(e){var o,i=this.getComponentProp(e,"__TYPE")||(e.type?e.type.displayName:void 0);!i&&e!==null&&e!==void 0&&(o=e.type)!==null&&o!==void 0&&(o=o._payload)!==null&&o!==void 0&&o.value&&(i=e.type._payload.value.find(function(u){return u===n}));var a=i===n;try{var s}catch{}return a}return!1}},{key:"getRefElement",value:function(e){return e?E(e)==="object"&&e.hasOwnProperty("current")?e.current:e:null}},{key:"combinedRefs",value:function(e,n){e&&n&&(typeof n=="function"?n(e.current):n.current=e.current)}},{key:"removeAccents",value:function(e){return e&&e.search(/[\xC0-\xFF]/g)>-1&&(e=e.replace(/[\xC0-\xC5]/g,"A").replace(/[\xC6]/g,"AE").replace(/[\xC7]/g,"C").replace(/[\xC8-\xCB]/g,"E").replace(/[\xCC-\xCF]/g,"I").replace(/[\xD0]/g,"D").replace(/[\xD1]/g,"N").replace(/[\xD2-\xD6\xD8]/g,"O").replace(/[\xD9-\xDC]/g,"U").replace(/[\xDD]/g,"Y").replace(/[\xDE]/g,"P").replace(/[\xE0-\xE5]/g,"a").replace(/[\xE6]/g,"ae").replace(/[\xE7]/g,"c").replace(/[\xE8-\xEB]/g,"e").replace(/[\xEC-\xEF]/g,"i").replace(/[\xF1]/g,"n").replace(/[\xF2-\xF6\xF8]/g,"o").replace(/[\xF9-\xFC]/g,"u").replace(/[\xFE]/g,"p").replace(/[\xFD\xFF]/g,"y")),e}},{key:"toFlatCase",value:function(e){return this.isNotEmpty(e)&&this.isString(e)?e.replace(/(-|_)/g,"").toLowerCase():e}},{key:"toCapitalCase",value:function(e){return this.isNotEmpty(e)&&this.isString(e)?e[0].toUpperCase()+e.slice(1):e}},{key:"trim",value:function(e){return this.isNotEmpty(e)&&this.isString(e)?e.trim():e}},{key:"isEmpty",value:function(e){return e==null||e===""||Array.isArray(e)&&e.length===0||!(e instanceof Date)&&E(e)==="object"&&Object.keys(e).length===0}},{key:"isNotEmpty",value:function(e){return!this.isEmpty(e)}},{key:"isFunction",value:function(e){return!!(e&&e.constructor&&e.call&&e.apply)}},{key:"isObject",value:function(e){return e!==null&&e instanceof Object&&e.constructor===Object}},{key:"isDate",value:function(e){return e!==null&&e instanceof Date&&e.constructor===Date}},{key:"isArray",value:function(e){return e!==null&&Array.isArray(e)}},{key:"isString",value:function(e){return e!==null&&typeof e=="string"}},{key:"isPrintableCharacter",value:function(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:"";return this.isNotEmpty(e)&&e.length===1&&e.match(/\S| /)}},{key:"isLetter",value:function(e){return/^[a-zA-Z\u00C0-\u017F]$/.test(e)}},{key:"isScalar",value:function(e){return e!=null&&(typeof e=="string"||typeof e=="number"||typeof e=="bigint"||typeof e=="boolean")}},{key:"findLast",value:function(e,n){var l;if(this.isNotEmpty(e))try{l=e.findLast(n)}catch{l=ae(e).reverse().find(n)}return l}},{key:"findLastIndex",value:function(e,n){var l=-1;if(this.isNotEmpty(e))try{l=e.findLastIndex(n)}catch{l=e.lastIndexOf(ae(e).reverse().find(n))}return l}},{key:"sort",value:function(e,n){var l=arguments.length>2&&arguments[2]!==void 0?arguments[2]:1,o=arguments.length>3?arguments[3]:void 0,i=arguments.length>4&&arguments[4]!==void 0?arguments[4]:1,a=this.compare(e,n,o,l),s=l;return(this.isEmpty(e)||this.isEmpty(n))&&(s=i===1?l:i),s*a}},{key:"compare",value:function(e,n,l){var o=arguments.length>3&&arguments[3]!==void 0?arguments[3]:1,i=-1,a=this.isEmpty(e),s=this.isEmpty(n);return a&&s?i=0:a?i=o:s?i=-o:typeof e=="string"&&typeof n=="string"?i=l(e,n):i=e<n?-1:e>n?1:0,i}},{key:"localeComparator",value:function(e){return new Intl.Collator(e,{numeric:!0}).compare}},{key:"findChildrenByKey",value:function(e,n){var l=qe(e),o;try{for(l.s();!(o=l.n()).done;){var i=o.value;if(i.key===n)return i.children||[];if(i.children){var a=this.findChildrenByKey(i.children,n);if(a.length>0)return a}}}catch(s){l.e(s)}finally{l.f()}return[]}},{key:"mutateFieldData",value:function(e,n,l){if(!(E(e)!=="object"||typeof n!="string"))for(var o=n.split("."),i=e,a=0,s=o.length;a<s;++a){if(a+1-s===0){i[o[a]]=l;break}i[o[a]]||(i[o[a]]={}),i=i[o[a]]}}},{key:"getNestedValue",value:function(e,n){return n.split(".").reduce(function(l,o){return l&&l[o]!==void 0?l[o]:void 0},e)}},{key:"absoluteCompare",value:function(e,n){var l=arguments.length>2&&arguments[2]!==void 0?arguments[2]:1,o=arguments.length>3&&arguments[3]!==void 0?arguments[3]:0;if(!e||!n||o>l)return!0;if(E(e)!==E(n))return!1;var i=Object.keys(e),a=Object.keys(n);if(i.length!==a.length)return!1;for(var s=0,u=i;s<u.length;s++){var c=u[s],p=e[c],f=n[c],d=r.isObject(p)&&r.isObject(f),h=r.isFunction(p)&&r.isFunction(f);if((d||h)&&!this.absoluteCompare(p,f,l,o+1)||!d&&p!==f)return!1}return!0}},{key:"selectiveCompare",value:function(e,n,l){var o=arguments.length>3&&arguments[3]!==void 0?arguments[3]:1;if(e===n)return!0;if(!e||!n||E(e)!=="object"||E(n)!=="object")return!1;if(!l)return this.absoluteCompare(e,n,1);var i=qe(l),a;try{for(i.s();!(a=i.n()).done;){var s=a.value,u=this.getNestedValue(e,s),c=this.getNestedValue(n,s),p=E(u)==="object"&&u!==null&&E(c)==="object"&&c!==null;if(p&&!this.absoluteCompare(u,c,o)||!p&&u!==c)return!1}}catch(f){i.e(f)}finally{i.f()}return!0}}])})();function ve(r,t){var e=Object.keys(r);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(r);t&&(n=n.filter(function(l){return Object.getOwnPropertyDescriptor(r,l).enumerable})),e.push.apply(e,n)}return e}function me(r){for(var t=1;t<arguments.length;t++){var e=arguments[t]!=null?arguments[t]:{};t%2?ve(Object(e),!0).forEach(function(n){de(r,n,e[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(r,Object.getOwnPropertyDescriptors(e)):ve(Object(e)).forEach(function(n){Object.defineProperty(r,n,Object.getOwnPropertyDescriptor(e,n))})}return r}function ne(r){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};if(r){var e=function(i){return typeof i=="function"},n=t.classNameMergeFunction,l=e(n);return r.reduce(function(o,i){if(!i)return o;var a=function(){var c=i[s];if(s==="style")o.style=me(me({},o.style),i.style);else if(s==="className"){var p="";l?p=n(o.className,i.className):p=[o.className,i.className].join(" ").trim(),o.className=p||void 0}else if(e(c)){var f=o[s];o[s]=f?function(){f.apply(void 0,arguments),c.apply(void 0,arguments)}:c}else o[s]=c};for(var s in i)a();return o},{})}}var N=Object.freeze({STARTS_WITH:"startsWith",CONTAINS:"contains",NOT_CONTAINS:"notContains",ENDS_WITH:"endsWith",EQUALS:"equals",NOT_EQUALS:"notEquals",IN:"in",NOT_IN:"notIn",LESS_THAN:"lt",LESS_THAN_OR_EQUAL_TO:"lte",GREATER_THAN:"gt",GREATER_THAN_OR_EQUAL_TO:"gte",BETWEEN:"between",DATE_IS:"dateIs",DATE_IS_NOT:"dateIsNot",DATE_BEFORE:"dateBefore",DATE_AFTER:"dateAfter",CUSTOM:"custom"});function Y(r){"@babel/helpers - typeof";return Y=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},Y(r)}function Ue(r,t){if(Y(r)!="object"||!r)return r;var e=r[Symbol.toPrimitive];if(e!==void 0){var n=e.call(r,t);if(Y(n)!="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(r)}function Be(r){var t=Ue(r,"string");return Y(t)=="symbol"?t:t+""}function j(r,t,e){return(t=Be(t))in r?Object.defineProperty(r,t,{value:e,enumerable:!0,configurable:!0,writable:!0}):r[t]=e,r}function Ve(r,t,e){return Object.defineProperty(r,"prototype",{writable:!1}),r}function Ye(r,t){if(!(r instanceof t))throw new TypeError("Cannot call a class as a function")}var L=Ve(function r(){Ye(this,r)});j(L,"ripple",!1);j(L,"inputStyle","outlined");j(L,"locale","en");j(L,"appendTo",null);j(L,"cssTransition",!0);j(L,"autoZIndex",!0);j(L,"hideOverlaysOnDocumentScrolling",!1);j(L,"nonce",null);j(L,"nullSortOrder",1);j(L,"zIndex",{modal:1100,overlay:1e3,menu:1e3,tooltip:1100,toast:1200});j(L,"pt",void 0);j(L,"filterMatchModeOptions",{text:[N.STARTS_WITH,N.CONTAINS,N.NOT_CONTAINS,N.ENDS_WITH,N.EQUALS,N.NOT_EQUALS],numeric:[N.EQUALS,N.NOT_EQUALS,N.LESS_THAN,N.LESS_THAN_OR_EQUAL_TO,N.GREATER_THAN,N.GREATER_THAN_OR_EQUAL_TO],date:[N.DATE_IS,N.DATE_IS_NOT,N.DATE_BEFORE,N.DATE_AFTER]});j(L,"changeTheme",function(r,t,e,n){var l,o=document.getElementById(e);if(!o)throw Error("Element with id ".concat(e," not found."));var i=o.getAttribute("href").replace(r,t),a=document.createElement("link");a.setAttribute("rel","stylesheet"),a.setAttribute("id",e),a.setAttribute("href",i),a.addEventListener("load",function(){n&&n()}),(l=o.parentNode)===null||l===void 0||l.replaceChild(a,o)});var fe=Ne.createContext(),te=L;function Qe(r){if(Array.isArray(r))return r}function Ke(r,t){var e=r==null?null:typeof Symbol<"u"&&r[Symbol.iterator]||r["@@iterator"];if(e!=null){var n,l,o,i,a=[],s=!0,u=!1;try{if(o=(e=e.call(r)).next,t!==0)for(;!(s=(n=o.call(e)).done)&&(a.push(n.value),a.length!==t);s=!0);}catch(c){u=!0,l=c}finally{try{if(!s&&e.return!=null&&(i=e.return(),Object(i)!==i))return}finally{if(u)throw l}}return a}}function be(r,t){(t==null||t>r.length)&&(t=r.length);for(var e=0,n=Array(t);e<t;e++)n[e]=r[e];return n}function Xe(r,t){if(r){if(typeof r=="string")return be(r,t);var e={}.toString.call(r).slice(8,-1);return e==="Object"&&r.constructor&&(e=r.constructor.name),e==="Map"||e==="Set"?Array.from(r):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?be(r,t):void 0}}function Ge(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Je(r,t){return Qe(r)||Ke(r,t)||Xe(r,t)||Ge()}var Ze=function(t){return q.useEffect(function(){return t},[])},en=function(){var t=q.useContext(fe);return function(){for(var e=arguments.length,n=new Array(e),l=0;l<e;l++)n[l]=arguments[l];return ne(n,t==null?void 0:t.ptOptions)}},Pe=function(t){var e=q.useRef(!1);return q.useEffect(function(){if(!e.current)return e.current=!0,t&&t()},[])},nn=0,X=function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},n=q.useState(!1),l=Je(n,2),o=l[0],i=l[1],a=q.useRef(null),s=q.useContext(fe),u=M.isClient()?window.document:void 0,c=e.document,p=c===void 0?u:c,f=e.manual,d=f===void 0?!1:f,h=e.name,v=h===void 0?"style_".concat(++nn):h,y=e.id,g=y===void 0?void 0:y,m=e.media,b=m===void 0?void 0:m,k=function(H){var z=H.querySelector('style[data-primereact-style-id="'.concat(v,'"]'));if(z)return z;if(g!==void 0){var O=p.getElementById(g);if(O)return O}return p.createElement("style")},T=function(H){o&&t!==H&&(a.current.textContent=H)},_=function(){if(!(!p||o)){var H=(s==null?void 0:s.styleContainer)||p.head;a.current=k(H),a.current.isConnected||(a.current.type="text/css",g&&(a.current.id=g),b&&(a.current.media=b),M.addNonce(a.current,s&&s.nonce||te.nonce),H.appendChild(a.current),v&&a.current.setAttribute("data-primereact-style-id",v)),a.current.textContent=t,i(!0)}},R=function(){!p||!a.current||(M.removeInlineStyle(a.current),i(!1))};return q.useEffect(function(){d||_()},[d]),{id:g,name:v,update:T,unload:R,load:_,isLoaded:o}},Z=function(t,e){var n=q.useRef(!1);return q.useEffect(function(){if(!n.current){n.current=!0;return}return t&&t()},e)};function se(r,t){(t==null||t>r.length)&&(t=r.length);for(var e=0,n=Array(t);e<t;e++)n[e]=r[e];return n}function tn(r){if(Array.isArray(r))return se(r)}function rn(r){if(typeof Symbol<"u"&&r[Symbol.iterator]!=null||r["@@iterator"]!=null)return Array.from(r)}function ln(r,t){if(r){if(typeof r=="string")return se(r,t);var e={}.toString.call(r).slice(8,-1);return e==="Object"&&r.constructor&&(e=r.constructor.name),e==="Map"||e==="Set"?Array.from(r):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?se(r,t):void 0}}function on(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function he(r){return tn(r)||rn(r)||ln(r)||on()}function Q(r){"@babel/helpers - typeof";return Q=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},Q(r)}function an(r,t){if(Q(r)!="object"||!r)return r;var e=r[Symbol.toPrimitive];if(e!==void 0){var n=e.call(r,t);if(Q(n)!="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(r)}function sn(r){var t=an(r,"string");return Q(t)=="symbol"?t:t+""}function ue(r,t,e){return(t=sn(t))in r?Object.defineProperty(r,t,{value:e,enumerable:!0,configurable:!0,writable:!0}):r[t]=e,r}function ye(r,t){var e=Object.keys(r);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(r);t&&(n=n.filter(function(l){return Object.getOwnPropertyDescriptor(r,l).enumerable})),e.push.apply(e,n)}return e}function P(r){for(var t=1;t<arguments.length;t++){var e=arguments[t]!=null?arguments[t]:{};t%2?ye(Object(e),!0).forEach(function(n){ue(r,n,e[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(r,Object.getOwnPropertyDescriptors(e)):ye(Object(e)).forEach(function(n){Object.defineProperty(r,n,Object.getOwnPropertyDescriptor(e,n))})}return r}var un=`
.p-hidden-accessible {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    opacity: 0;
    overflow: hidden;
    padding: 0;
    pointer-events: none;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}

.p-overflow-hidden {
    overflow: hidden;
    padding-right: var(--scrollbar-width);
}
`,cn=`
.p-button {
    margin: 0;
    display: inline-flex;
    cursor: pointer;
    user-select: none;
    align-items: center;
    vertical-align: bottom;
    text-align: center;
    overflow: hidden;
    position: relative;
}

.p-button-label {
    flex: 1 1 auto;
}

.p-button-icon {
    pointer-events: none;
}

.p-button-icon-right {
    order: 1;
}

.p-button:disabled {
    cursor: default;
}

.p-button-icon-only {
    justify-content: center;
}

.p-button-icon-only .p-button-label {
    visibility: hidden;
    width: 0;
    flex: 0 0 auto;
}

.p-button-vertical {
    flex-direction: column;
}

.p-button-icon-bottom {
    order: 2;
}

.p-button-group .p-button {
    margin: 0;
}

.p-button-group .p-button:not(:last-child) {
    border-right: 0 none;
}

.p-button-group .p-button:not(:first-of-type):not(:last-of-type) {
    border-radius: 0;
}

.p-button-group .p-button:first-of-type {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.p-button-group .p-button:last-of-type {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.p-button-group .p-button:focus {
    position: relative;
    z-index: 1;
}

.p-button-group-single .p-button:first-of-type {
    border-top-right-radius: var(--border-radius) !important;
    border-bottom-right-radius: var(--border-radius) !important;
}

.p-button-group-single .p-button:last-of-type {
    border-top-left-radius: var(--border-radius) !important;
    border-bottom-left-radius: var(--border-radius) !important;
}
`,dn=`
.p-inputtext {
    margin: 0;
}

.p-fluid .p-inputtext {
    width: 100%;
}

/* InputGroup */
.p-inputgroup {
    display: flex;
    align-items: stretch;
    width: 100%;
}

.p-inputgroup-addon {
    display: flex;
    align-items: center;
    justify-content: center;
}

.p-inputgroup .p-float-label {
    display: flex;
    align-items: stretch;
    width: 100%;
}

.p-inputgroup .p-inputtext,
.p-fluid .p-inputgroup .p-inputtext,
.p-inputgroup .p-inputwrapper,
.p-fluid .p-inputgroup .p-input {
    flex: 1 1 auto;
    width: 1%;
}

/* Floating Label */
.p-float-label {
    display: block;
    position: relative;
}

.p-float-label label {
    position: absolute;
    pointer-events: none;
    top: 50%;
    margin-top: -0.5rem;
    transition-property: all;
    transition-timing-function: ease;
    line-height: 1;
}

.p-float-label textarea ~ label,
.p-float-label .p-mention ~ label {
    top: 1rem;
}

.p-float-label input:focus ~ label,
.p-float-label input:-webkit-autofill ~ label,
.p-float-label input.p-filled ~ label,
.p-float-label textarea:focus ~ label,
.p-float-label textarea.p-filled ~ label,
.p-float-label .p-inputwrapper-focus ~ label,
.p-float-label .p-inputwrapper-filled ~ label,
.p-float-label .p-tooltip-target-wrapper ~ label {
    top: -0.75rem;
    font-size: 12px;
}

.p-float-label .p-placeholder,
.p-float-label input::placeholder,
.p-float-label .p-inputtext::placeholder {
    opacity: 0;
    transition-property: all;
    transition-timing-function: ease;
}

.p-float-label .p-focus .p-placeholder,
.p-float-label input:focus::placeholder,
.p-float-label .p-inputtext:focus::placeholder {
    opacity: 1;
    transition-property: all;
    transition-timing-function: ease;
}

.p-input-icon-left,
.p-input-icon-right {
    position: relative;
    display: inline-block;
}

.p-input-icon-left > i,
.p-input-icon-right > i,
.p-input-icon-left > svg,
.p-input-icon-right > svg,
.p-input-icon-left > .p-input-prefix,
.p-input-icon-right > .p-input-suffix {
    position: absolute;
    top: 50%;
    margin-top: -0.5rem;
}

.p-fluid .p-input-icon-left,
.p-fluid .p-input-icon-right {
    display: block;
    width: 100%;
}
`,fn=`
.p-icon {
    display: inline-block;
}

.p-icon-spin {
    -webkit-animation: p-icon-spin 2s infinite linear;
    animation: p-icon-spin 2s infinite linear;
}

svg.p-icon {
    pointer-events: auto;
}

svg.p-icon g,
.p-disabled svg.p-icon {
    pointer-events: none;
}

@-webkit-keyframes p-icon-spin {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
    }
    100% {
        -webkit-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}

@keyframes p-icon-spin {
    0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
    }
    100% {
        -webkit-transform: rotate(359deg);
        transform: rotate(359deg);
    }
}
`,pn=`
@layer primereact {
    .p-component, .p-component * {
        box-sizing: border-box;
    }

    .p-hidden {
        display: none;
    }

    .p-hidden-space {
        visibility: hidden;
    }

    .p-reset {
        margin: 0;
        padding: 0;
        border: 0;
        outline: 0;
        text-decoration: none;
        font-size: 100%;
        list-style: none;
    }

    .p-disabled, .p-disabled * {
        cursor: default;
        pointer-events: none;
        user-select: none;
    }

    .p-component-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .p-unselectable-text {
        user-select: none;
    }

    .p-scrollbar-measure {
        width: 100px;
        height: 100px;
        overflow: scroll;
        position: absolute;
        top: -9999px;
    }

    @-webkit-keyframes p-fadein {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes p-fadein {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }

    .p-link {
        text-align: left;
        background-color: transparent;
        margin: 0;
        padding: 0;
        border: none;
        cursor: pointer;
        user-select: none;
    }

    .p-link:disabled {
        cursor: default;
    }

    /* Non react overlay animations */
    .p-connected-overlay {
        opacity: 0;
        transform: scaleY(0.8);
        transition: transform .12s cubic-bezier(0, 0, 0.2, 1), opacity .12s cubic-bezier(0, 0, 0.2, 1);
    }

    .p-connected-overlay-visible {
        opacity: 1;
        transform: scaleY(1);
    }

    .p-connected-overlay-hidden {
        opacity: 0;
        transform: scaleY(1);
        transition: opacity .1s linear;
    }

    /* React based overlay animations */
    .p-connected-overlay-enter {
        opacity: 0;
        transform: scaleY(0.8);
    }

    .p-connected-overlay-enter-active {
        opacity: 1;
        transform: scaleY(1);
        transition: transform .12s cubic-bezier(0, 0, 0.2, 1), opacity .12s cubic-bezier(0, 0, 0.2, 1);
    }

    .p-connected-overlay-enter-done {
        transform: none;
    }

    .p-connected-overlay-exit {
        opacity: 1;
    }

    .p-connected-overlay-exit-active {
        opacity: 0;
        transition: opacity .1s linear;
    }

    /* Toggleable Content */
    .p-toggleable-content-enter {
        max-height: 0;
    }

    .p-toggleable-content-enter-active {
        overflow: hidden;
        max-height: 1000px;
        transition: max-height 1s ease-in-out;
    }

    .p-toggleable-content-enter-done {
        transform: none;
    }

    .p-toggleable-content-exit {
        max-height: 1000px;
    }

    .p-toggleable-content-exit-active {
        overflow: hidden;
        max-height: 0;
        transition: max-height 0.45s cubic-bezier(0, 1, 0, 1);
    }

    /* @todo Refactor */
    .p-menu .p-menuitem-link {
        cursor: pointer;
        display: flex;
        align-items: center;
        text-decoration: none;
        overflow: hidden;
        position: relative;
    }

    `.concat(cn,`
    `).concat(dn,`
    `).concat(fn,`
}
`),C={cProps:void 0,cParams:void 0,cName:void 0,defaultProps:{pt:void 0,ptOptions:void 0,unstyled:!1},context:{},globalCSS:void 0,classes:{},styles:"",extend:function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},e=t.css,n=P(P({},t.defaultProps),C.defaultProps),l={},o=function(c){var p=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return C.context=p,C.cProps=c,S.getMergedProps(c,n)},i=function(c){return S.getDiffProps(c,n)},a=function(){var c,p=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},f=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"",d=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},h=arguments.length>3&&arguments[3]!==void 0?arguments[3]:!0;p.hasOwnProperty("pt")&&p.pt!==void 0&&(p=p.pt);var v=f,y=/./g.test(v)&&!!d[v.split(".")[0]],g=y?S.toFlatCase(v.split(".")[1]):S.toFlatCase(v),m=d.hostName&&S.toFlatCase(d.hostName),b=m||d.props&&d.props.__TYPE&&S.toFlatCase(d.props.__TYPE)||"",k=g==="transition",T="data-pc-",_=function(x){return x!=null&&x.props?x.hostName?x.props.__TYPE===x.hostName?x.props:_(x.parent):x.parent:void 0},R=function(x){var B,V;return((B=d.props)===null||B===void 0?void 0:B[x])||((V=_(d))===null||V===void 0?void 0:V[x])};C.cParams=d,C.cName=b;var W=R("ptOptions")||C.context.ptOptions||{},H=W.mergeSections,z=H===void 0?!0:H,O=W.mergeProps,A=O===void 0?!1:O,w=function(){var x=D.apply(void 0,arguments);return Array.isArray(x)?{className:ee.apply(void 0,he(x))}:S.isString(x)?{className:x}:x!=null&&x.hasOwnProperty("className")&&Array.isArray(x.className)?{className:ee.apply(void 0,he(x.className))}:x},F=h?y?Oe(w,v,d):Ae(w,v,d):void 0,$=y?void 0:le(re(p,b),w,v,d),I=!k&&P(P({},g==="root"&&ue({},"".concat(T,"name"),d.props&&d.props.__parentMetadata?S.toFlatCase(d.props.__TYPE):b)),{},ue({},"".concat(T,"section"),g));return z||!z&&$?A?ne([F,$,Object.keys(I).length?I:{}],{classNameMergeFunction:(c=C.context.ptOptions)===null||c===void 0?void 0:c.classNameMergeFunction}):P(P(P({},F),$),Object.keys(I).length?I:{}):P(P({},$),Object.keys(I).length?I:{})},s=function(){var c=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},p=c.props,f=c.state,d=function(){var b=arguments.length>0&&arguments[0]!==void 0?arguments[0]:"",k=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return a((p||{}).pt,b,P(P({},c),k))},h=function(){var b=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},k=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"",T=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};return a(b,k,T,!1)},v=function(){return C.context.unstyled||te.unstyled||p.unstyled},y=function(){var b=arguments.length>0&&arguments[0]!==void 0?arguments[0]:"",k=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return v()?void 0:D(e&&e.classes,b,P({props:p,state:f},k))},g=function(){var b=arguments.length>0&&arguments[0]!==void 0?arguments[0]:"",k=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},T=arguments.length>2&&arguments[2]!==void 0?arguments[2]:!0;if(T){var _,R=D(e&&e.inlineStyles,b,P({props:p,state:f},k)),W=D(l,b,P({props:p,state:f},k));return ne([W,R],{classNameMergeFunction:(_=C.context.ptOptions)===null||_===void 0?void 0:_.classNameMergeFunction})}};return{ptm:d,ptmo:h,sx:g,cx:y,isUnstyled:v}};return P(P({getProps:o,getOtherProps:i,setMetaData:s},t),{},{defaultProps:n})}},D=function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"",n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},l=String(S.toFlatCase(e)).split("."),o=l.shift(),i=S.isNotEmpty(t)?Object.keys(t).find(function(a){return S.toFlatCase(a)===o}):"";return o?S.isObject(t)?D(S.getItemValue(t[i],n),l.join("."),n):void 0:S.getItemValue(t,n)},re=function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"",n=arguments.length>2?arguments[2]:void 0,l=t==null?void 0:t._usept,o=function(a){var s,u=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1,c=n?n(a):a,p=S.toFlatCase(e);return(s=u?p!==C.cName?c==null?void 0:c[p]:void 0:c==null?void 0:c[p])!==null&&s!==void 0?s:c};return S.isNotEmpty(l)?{_usept:l,originalValue:o(t.originalValue),value:o(t.value)}:o(t,!0)},le=function(t,e,n,l){var o=function(v){return e(v,n,l)};if(t!=null&&t.hasOwnProperty("_usept")){var i=t._usept||C.context.ptOptions||{},a=i.mergeSections,s=a===void 0?!0:a,u=i.mergeProps,c=u===void 0?!1:u,p=i.classNameMergeFunction,f=o(t.originalValue),d=o(t.value);return f===void 0&&d===void 0?void 0:S.isString(d)?d:S.isString(f)?f:s||!s&&d?c?ne([f,d],{classNameMergeFunction:p}):P(P({},f),d):d}return o(t)},qn=function(){return re(C.context.pt||te.pt,void 0,function(t){return S.getItemValue(t,C.cParams)})},gn=function(){return re(C.context.pt||te.pt,void 0,function(t){return D(t,C.cName,C.cParams)||S.getItemValue(t,C.cParams)})},Oe=function(t,e,n){return le(qn(),t,e,n)},Ae=function(t,e,n){return le(gn(),t,e,n)},vn=function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:function(){},n=arguments.length>2?arguments[2]:void 0,l=n.name,o=n.styled,i=o===void 0?!1:o,a=n.hostName,s=a===void 0?"":a,u=Oe(D,"global.css",C.cParams),c=S.toFlatCase(l),p=X(un,{name:"base",manual:!0}),f=p.load,d=X(pn,{name:"common",manual:!0}),h=d.load,v=X(u,{name:"global",manual:!0}),y=v.load,g=X(t,{name:l,manual:!0}),m=g.load,b=function(T){if(!s){var _=le(re((C.cProps||{}).pt,c),D,"hooks.".concat(T)),R=Ae(D,"hooks.".concat(T));_==null||_(),R==null||R()}};b("useMountEffect"),Pe(function(){f(),y(),e()||(h(),i||m())}),Z(function(){b("useUpdateEffect")}),Ze(function(){b("useUnmountEffect")})};function ce(){return ce=Object.assign?Object.assign.bind():function(r){for(var t=1;t<arguments.length;t++){var e=arguments[t];for(var n in e)({}).hasOwnProperty.call(e,n)&&(r[n]=e[n])}return r},ce.apply(null,arguments)}function K(r){"@babel/helpers - typeof";return K=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},K(r)}function mn(r,t){if(K(r)!="object"||!r)return r;var e=r[Symbol.toPrimitive];if(e!==void 0){var n=e.call(r,t);if(K(n)!="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(r)}function bn(r){var t=mn(r,"string");return K(t)=="symbol"?t:t+""}function hn(r,t,e){return(t=bn(t))in r?Object.defineProperty(r,t,{value:e,enumerable:!0,configurable:!0,writable:!0}):r[t]=e,r}function yn(r){if(Array.isArray(r))return r}function wn(r,t){var e=r==null?null:typeof Symbol<"u"&&r[Symbol.iterator]||r["@@iterator"];if(e!=null){var n,l,o,i,a=[],s=!0,u=!1;try{if(o=(e=e.call(r)).next,t!==0)for(;!(s=(n=o.call(e)).done)&&(a.push(n.value),a.length!==t);s=!0);}catch(c){u=!0,l=c}finally{try{if(!s&&e.return!=null&&(i=e.return(),Object(i)!==i))return}finally{if(u)throw l}}return a}}function we(r,t){(t==null||t>r.length)&&(t=r.length);for(var e=0,n=Array(t);e<t;e++)n[e]=r[e];return n}function kn(r,t){if(r){if(typeof r=="string")return we(r,t);var e={}.toString.call(r).slice(8,-1);return e==="Object"&&r.constructor&&(e=r.constructor.name),e==="Map"||e==="Set"?Array.from(r):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?we(r,t):void 0}}function xn(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function En(r,t){return yn(r)||wn(r,t)||kn(r,t)||xn()}var Sn={root:function(t){var e=t.props;return ee("",e.className)},toolbar:"",content:""},Cn=`
/*!
 * Quill Editor v2.0.2
 * https://quilljs.com
 * Copyright (c) 2017-2024, Slab
 * Copyright (c) 2014, Jason Chen
 * Copyright (c) 2013, salesforce.com
 */
.ql-container {
  box-sizing: border-box;
  font-family: Helvetica, Arial, sans-serif;
  font-size: 13px;
  height: 100%;
  margin: 0;
  position: relative;
}
.ql-container.ql-disabled .ql-tooltip {
  visibility: hidden;
}
.ql-container:not(.ql-disabled) li[data-list="checked"] > .ql-ui,
.ql-container:not(.ql-disabled) li[data-list="unchecked"] > .ql-ui {
  cursor: pointer;
}
.ql-clipboard {
  left: -100000px;
  height: 1px;
  overflow-y: hidden;
  position: absolute;
  top: 50%;
}
.ql-clipboard p {
  margin: 0;
  padding: 0;
}
.ql-editor {
  box-sizing: border-box;
  counter-reset: list-0 list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8
    list-9;
  line-height: 1.42;
  height: 100%;
  outline: none;
  overflow-y: auto;
  padding: 12px 15px;
  tab-size: 4;
  -moz-tab-size: 4;
  text-align: left;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.ql-editor > * {
  cursor: text;
}
.ql-editor p,
.ql-editor ol,
.ql-editor pre,
.ql-editor blockquote,
.ql-editor h1,
.ql-editor h2,
.ql-editor h3,
.ql-editor h4,
.ql-editor h5,
.ql-editor h6 {
  margin: 0;
  padding: 0;
}
@supports (counter-set: none) {
  .ql-editor p,
  .ql-editor h1,
  .ql-editor h2,
  .ql-editor h3,
  .ql-editor h4,
  .ql-editor h5,
  .ql-editor h6 {
    counter-set: list-0 list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8
      list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor p,
  .ql-editor h1,
  .ql-editor h2,
  .ql-editor h3,
  .ql-editor h4,
  .ql-editor h5,
  .ql-editor h6 {
    counter-reset: list-0 list-1 list-2 list-3 list-4 list-5 list-6 list-7
      list-8 list-9;
  }
}
.ql-editor table {
  border-collapse: collapse;
}
.ql-editor td {
  border: 1px solid #000;
  padding: 2px 5px;
}
.ql-editor ol {
  padding-left: 1.5em;
}
.ql-editor li {
  list-style-type: none;
  padding-left: 1.5em;
  position: relative;
}
.ql-editor li > .ql-ui:before {
  display: inline-block;
  margin-left: -1.5em;
  margin-right: 0.3em;
  text-align: right;
  white-space: nowrap;
  width: 1.2em;
}
.ql-editor li[data-list="checked"] > .ql-ui,
.ql-editor li[data-list="unchecked"] > .ql-ui {
  color: #777;
}
.ql-editor li[data-list="bullet"] > .ql-ui:before {
  content: "\\2022";
}
.ql-editor li[data-list="checked"] > .ql-ui:before {
  content: "\\2611";
}
.ql-editor li[data-list="unchecked"] > .ql-ui:before {
  content: "\\2610";
}
@supports (counter-set: none) {
  .ql-editor li[data-list] {
    counter-set: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list] {
    counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8
      list-9;
  }
}
.ql-editor li[data-list="ordered"] {
  counter-increment: list-0;
}
.ql-editor li[data-list="ordered"] > .ql-ui:before {
  content: counter(list-0, decimal) ". ";
}
.ql-editor li[data-list="ordered"].ql-indent-1 {
  counter-increment: list-1;
}
.ql-editor li[data-list="ordered"].ql-indent-1 > .ql-ui:before {
  content: counter(list-1, lower-alpha) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-1 {
    counter-set: list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-1 {
    counter-reset: list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-2 {
  counter-increment: list-2;
}
.ql-editor li[data-list="ordered"].ql-indent-2 > .ql-ui:before {
  content: counter(list-2, lower-roman) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-2 {
    counter-set: list-3 list-4 list-5 list-6 list-7 list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-2 {
    counter-reset: list-3 list-4 list-5 list-6 list-7 list-8 list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-3 {
  counter-increment: list-3;
}
.ql-editor li[data-list="ordered"].ql-indent-3 > .ql-ui:before {
  content: counter(list-3, decimal) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-3 {
    counter-set: list-4 list-5 list-6 list-7 list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-3 {
    counter-reset: list-4 list-5 list-6 list-7 list-8 list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-4 {
  counter-increment: list-4;
}
.ql-editor li[data-list="ordered"].ql-indent-4 > .ql-ui:before {
  content: counter(list-4, lower-alpha) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-4 {
    counter-set: list-5 list-6 list-7 list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-4 {
    counter-reset: list-5 list-6 list-7 list-8 list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-5 {
  counter-increment: list-5;
}
.ql-editor li[data-list="ordered"].ql-indent-5 > .ql-ui:before {
  content: counter(list-5, lower-roman) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-5 {
    counter-set: list-6 list-7 list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-5 {
    counter-reset: list-6 list-7 list-8 list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-6 {
  counter-increment: list-6;
}
.ql-editor li[data-list="ordered"].ql-indent-6 > .ql-ui:before {
  content: counter(list-6, decimal) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-6 {
    counter-set: list-7 list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-6 {
    counter-reset: list-7 list-8 list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-7 {
  counter-increment: list-7;
}
.ql-editor li[data-list="ordered"].ql-indent-7 > .ql-ui:before {
  content: counter(list-7, lower-alpha) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-7 {
    counter-set: list-8 list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-7 {
    counter-reset: list-8 list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-8 {
  counter-increment: list-8;
}
.ql-editor li[data-list="ordered"].ql-indent-8 > .ql-ui:before {
  content: counter(list-8, lower-roman) ". ";
}
@supports (counter-set: none) {
  .ql-editor li[data-list].ql-indent-8 {
    counter-set: list-9;
  }
}
@supports not (counter-set: none) {
  .ql-editor li[data-list].ql-indent-8 {
    counter-reset: list-9;
  }
}
.ql-editor li[data-list="ordered"].ql-indent-9 {
  counter-increment: list-9;
}
.ql-editor li[data-list="ordered"].ql-indent-9 > .ql-ui:before {
  content: counter(list-9, decimal) ". ";
}
.ql-editor .ql-indent-1:not(.ql-direction-rtl) {
  padding-left: 3em;
}
.ql-editor li.ql-indent-1:not(.ql-direction-rtl) {
  padding-left: 4.5em;
}
.ql-editor .ql-indent-1.ql-direction-rtl.ql-align-right {
  padding-right: 3em;
}
.ql-editor li.ql-indent-1.ql-direction-rtl.ql-align-right {
  padding-right: 4.5em;
}
.ql-editor .ql-indent-2:not(.ql-direction-rtl) {
  padding-left: 6em;
}
.ql-editor li.ql-indent-2:not(.ql-direction-rtl) {
  padding-left: 7.5em;
}
.ql-editor .ql-indent-2.ql-direction-rtl.ql-align-right {
  padding-right: 6em;
}
.ql-editor li.ql-indent-2.ql-direction-rtl.ql-align-right {
  padding-right: 7.5em;
}
.ql-editor .ql-indent-3:not(.ql-direction-rtl) {
  padding-left: 9em;
}
.ql-editor li.ql-indent-3:not(.ql-direction-rtl) {
  padding-left: 10.5em;
}
.ql-editor .ql-indent-3.ql-direction-rtl.ql-align-right {
  padding-right: 9em;
}
.ql-editor li.ql-indent-3.ql-direction-rtl.ql-align-right {
  padding-right: 10.5em;
}
.ql-editor .ql-indent-4:not(.ql-direction-rtl) {
  padding-left: 12em;
}
.ql-editor li.ql-indent-4:not(.ql-direction-rtl) {
  padding-left: 13.5em;
}
.ql-editor .ql-indent-4.ql-direction-rtl.ql-align-right {
  padding-right: 12em;
}
.ql-editor li.ql-indent-4.ql-direction-rtl.ql-align-right {
  padding-right: 13.5em;
}
.ql-editor .ql-indent-5:not(.ql-direction-rtl) {
  padding-left: 15em;
}
.ql-editor li.ql-indent-5:not(.ql-direction-rtl) {
  padding-left: 16.5em;
}
.ql-editor .ql-indent-5.ql-direction-rtl.ql-align-right {
  padding-right: 15em;
}
.ql-editor li.ql-indent-5.ql-direction-rtl.ql-align-right {
  padding-right: 16.5em;
}
.ql-editor .ql-indent-6:not(.ql-direction-rtl) {
  padding-left: 18em;
}
.ql-editor li.ql-indent-6:not(.ql-direction-rtl) {
  padding-left: 19.5em;
}
.ql-editor .ql-indent-6.ql-direction-rtl.ql-align-right {
  padding-right: 18em;
}
.ql-editor li.ql-indent-6.ql-direction-rtl.ql-align-right {
  padding-right: 19.5em;
}
.ql-editor .ql-indent-7:not(.ql-direction-rtl) {
  padding-left: 21em;
}
.ql-editor li.ql-indent-7:not(.ql-direction-rtl) {
  padding-left: 22.5em;
}
.ql-editor .ql-indent-7.ql-direction-rtl.ql-align-right {
  padding-right: 21em;
}
.ql-editor li.ql-indent-7.ql-direction-rtl.ql-align-right {
  padding-right: 22.5em;
}
.ql-editor .ql-indent-8:not(.ql-direction-rtl) {
  padding-left: 24em;
}
.ql-editor li.ql-indent-8:not(.ql-direction-rtl) {
  padding-left: 25.5em;
}
.ql-editor .ql-indent-8.ql-direction-rtl.ql-align-right {
  padding-right: 24em;
}
.ql-editor li.ql-indent-8.ql-direction-rtl.ql-align-right {
  padding-right: 25.5em;
}
.ql-editor .ql-indent-9:not(.ql-direction-rtl) {
  padding-left: 27em;
}
.ql-editor li.ql-indent-9:not(.ql-direction-rtl) {
  padding-left: 28.5em;
}
.ql-editor .ql-indent-9.ql-direction-rtl.ql-align-right {
  padding-right: 27em;
}
.ql-editor li.ql-indent-9.ql-direction-rtl.ql-align-right {
  padding-right: 28.5em;
}
.ql-editor li.ql-direction-rtl {
  padding-right: 1.5em;
}
.ql-editor li.ql-direction-rtl > .ql-ui:before {
  margin-left: 0.3em;
  margin-right: -1.5em;
  text-align: left;
}
.ql-editor table {
  table-layout: fixed;
  width: 100%;
}
.ql-editor table td {
  outline: none;
}
.ql-editor .ql-code-block-container {
  font-family: monospace;
}
.ql-editor .ql-video {
  display: block;
  max-width: 100%;
}
.ql-editor .ql-video.ql-align-center {
  margin: 0 auto;
}
.ql-editor .ql-video.ql-align-right {
  margin: 0 0 0 auto;
}
.ql-editor .ql-bg-black {
  background-color: #000;
}
.ql-editor .ql-bg-red {
  background-color: #e60000;
}
.ql-editor .ql-bg-orange {
  background-color: #f90;
}
.ql-editor .ql-bg-yellow {
  background-color: #ff0;
}
.ql-editor .ql-bg-green {
  background-color: #008a00;
}
.ql-editor .ql-bg-blue {
  background-color: #06c;
}
.ql-editor .ql-bg-purple {
  background-color: #93f;
}
.ql-editor .ql-color-white {
  color: #fff;
}
.ql-editor .ql-color-red {
  color: #e60000;
}
.ql-editor .ql-color-orange {
  color: #f90;
}
.ql-editor .ql-color-yellow {
  color: #ff0;
}
.ql-editor .ql-color-green {
  color: #008a00;
}
.ql-editor .ql-color-blue {
  color: #06c;
}
.ql-editor .ql-color-purple {
  color: #93f;
}
.ql-editor .ql-font-serif {
  font-family: Georgia, Times New Roman, serif;
}
.ql-editor .ql-font-monospace {
  font-family: Monaco, Courier New, monospace;
}
.ql-editor .ql-size-small {
  font-size: 0.75em;
}
.ql-editor .ql-size-large {
  font-size: 1.5em;
}
.ql-editor .ql-size-huge {
  font-size: 2.5em;
}
.ql-editor .ql-direction-rtl {
  direction: rtl;
  text-align: inherit;
}
.ql-editor .ql-align-center {
  text-align: center;
}
.ql-editor .ql-align-justify {
  text-align: justify;
}
.ql-editor .ql-align-right {
  text-align: right;
}
.ql-editor .ql-ui {
  position: absolute;
}
.ql-editor.ql-blank::before {
  color: rgba(0, 0, 0, 0.6);
  content: attr(data-placeholder);
  font-style: italic;
  left: 15px;
  pointer-events: none;
  position: absolute;
  right: 15px;
}
.ql-snow.ql-toolbar:after,
.ql-snow .ql-toolbar:after {
  clear: both;
  content: "";
  display: table;
}
.ql-snow.ql-toolbar button,
.ql-snow .ql-toolbar button {
  background: none;
  border: none;
  cursor: pointer;
  display: inline-block;
  float: left;
  height: 24px;
  padding: 3px 5px;
  width: 28px;
}
.ql-snow.ql-toolbar button svg,
.ql-snow .ql-toolbar button svg {
  float: left;
  height: 100%;
}
.ql-snow.ql-toolbar button:active:hover,
.ql-snow .ql-toolbar button:active:hover {
  outline: none;
}
.ql-snow.ql-toolbar input.ql-image[type="file"],
.ql-snow .ql-toolbar input.ql-image[type="file"] {
  display: none;
}
.ql-snow.ql-toolbar button:hover,
.ql-snow .ql-toolbar button:hover,
.ql-snow.ql-toolbar button:focus,
.ql-snow .ql-toolbar button:focus,
.ql-snow.ql-toolbar button.ql-active,
.ql-snow .ql-toolbar button.ql-active,
.ql-snow.ql-toolbar .ql-picker-label:hover,
.ql-snow .ql-toolbar .ql-picker-label:hover,
.ql-snow.ql-toolbar .ql-picker-label.ql-active,
.ql-snow .ql-toolbar .ql-picker-label.ql-active,
.ql-snow.ql-toolbar .ql-picker-item:hover,
.ql-snow .ql-toolbar .ql-picker-item:hover,
.ql-snow.ql-toolbar .ql-picker-item.ql-selected,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected {
  color: #06c;
}
.ql-snow.ql-toolbar button:hover .ql-fill,
.ql-snow .ql-toolbar button:hover .ql-fill,
.ql-snow.ql-toolbar button:focus .ql-fill,
.ql-snow .ql-toolbar button:focus .ql-fill,
.ql-snow.ql-toolbar button.ql-active .ql-fill,
.ql-snow .ql-toolbar button.ql-active .ql-fill,
.ql-snow.ql-toolbar .ql-picker-label:hover .ql-fill,
.ql-snow .ql-toolbar .ql-picker-label:hover .ql-fill,
.ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-fill,
.ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-fill,
.ql-snow.ql-toolbar .ql-picker-item:hover .ql-fill,
.ql-snow .ql-toolbar .ql-picker-item:hover .ql-fill,
.ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-fill,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-fill,
.ql-snow.ql-toolbar button:hover .ql-stroke.ql-fill,
.ql-snow .ql-toolbar button:hover .ql-stroke.ql-fill,
.ql-snow.ql-toolbar button:focus .ql-stroke.ql-fill,
.ql-snow .ql-toolbar button:focus .ql-stroke.ql-fill,
.ql-snow.ql-toolbar button.ql-active .ql-stroke.ql-fill,
.ql-snow .ql-toolbar button.ql-active .ql-stroke.ql-fill,
.ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
.ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
.ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
.ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
.ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
.ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
.ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill {
  fill: #06c;
}
.ql-snow.ql-toolbar button:hover .ql-stroke,
.ql-snow .ql-toolbar button:hover .ql-stroke,
.ql-snow.ql-toolbar button:focus .ql-stroke,
.ql-snow .ql-toolbar button:focus .ql-stroke,
.ql-snow.ql-toolbar button.ql-active .ql-stroke,
.ql-snow .ql-toolbar button.ql-active .ql-stroke,
.ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
.ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
.ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
.ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
.ql-snow.ql-toolbar button:hover .ql-stroke-miter,
.ql-snow .ql-toolbar button:hover .ql-stroke-miter,
.ql-snow.ql-toolbar button:focus .ql-stroke-miter,
.ql-snow .ql-toolbar button:focus .ql-stroke-miter,
.ql-snow.ql-toolbar button.ql-active .ql-stroke-miter,
.ql-snow .ql-toolbar button.ql-active .ql-stroke-miter,
.ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
.ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
.ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
.ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
.ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
.ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
.ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter,
.ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
  stroke: #06c;
}
@media (pointer: coarse) {
  .ql-snow.ql-toolbar button:hover:not(.ql-active),
  .ql-snow .ql-toolbar button:hover:not(.ql-active) {
    color: #444;
  }
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-fill,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-fill,
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-stroke.ql-fill,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-stroke.ql-fill {
    fill: #444;
  }
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-stroke,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-stroke,
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-stroke-miter,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-stroke-miter {
    stroke: #444;
  }
}
.ql-snow {
  box-sizing: border-box;
}
.ql-snow * {
  box-sizing: border-box;
}
.ql-snow .ql-hidden {
  display: none;
}
.ql-snow .ql-out-bottom,
.ql-snow .ql-out-top {
  visibility: hidden;
}
.ql-snow .ql-tooltip {
  position: absolute;
  transform: translateY(10px);
}
.ql-snow .ql-tooltip a {
  cursor: pointer;
  text-decoration: none;
}
.ql-snow .ql-tooltip.ql-flip {
  transform: translateY(-10px);
}
.ql-snow .ql-formats {
  display: inline-block;
  vertical-align: middle;
}
.ql-snow .ql-formats:after {
  clear: both;
  content: "";
  display: table;
}
.ql-snow .ql-stroke {
  fill: none;
  stroke: #444;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}
.ql-snow .ql-stroke-miter {
  fill: none;
  stroke: #444;
  stroke-miterlimit: 10;
  stroke-width: 2;
}
.ql-snow .ql-fill,
.ql-snow .ql-stroke.ql-fill {
  fill: #444;
}
.ql-snow .ql-empty {
  fill: none;
}
.ql-snow .ql-even {
  fill-rule: evenodd;
}
.ql-snow .ql-thin,
.ql-snow .ql-stroke.ql-thin {
  stroke-width: 1;
}
.ql-snow .ql-transparent {
  opacity: 0.4;
}
.ql-snow .ql-direction svg:last-child {
  display: none;
}
.ql-snow .ql-direction.ql-active svg:last-child {
  display: inline;
}
.ql-snow .ql-direction.ql-active svg:first-child {
  display: none;
}
.ql-snow .ql-editor h1 {
  font-size: 2em;
}
.ql-snow .ql-editor h2 {
  font-size: 1.5em;
}
.ql-snow .ql-editor h3 {
  font-size: 1.17em;
}
.ql-snow .ql-editor h4 {
  font-size: 1em;
}
.ql-snow .ql-editor h5 {
  font-size: 0.83em;
}
.ql-snow .ql-editor h6 {
  font-size: 0.67em;
}
.ql-snow .ql-editor a {
  text-decoration: underline;
}
.ql-snow .ql-editor blockquote {
  border-left: 4px solid #ccc;
  margin-bottom: 5px;
  margin-top: 5px;
  padding-left: 16px;
}
.ql-snow .ql-editor code,
.ql-snow .ql-editor .ql-code-block-container {
  background-color: #f0f0f0;
  border-radius: 3px;
}
.ql-snow .ql-editor .ql-code-block-container {
  margin-bottom: 5px;
  margin-top: 5px;
  padding: 5px 10px;
}
.ql-snow .ql-editor code {
  font-size: 85%;
  padding: 2px 4px;
}
.ql-snow .ql-editor .ql-code-block-container {
  background-color: #23241f;
  color: #f8f8f2;
  overflow: visible;
}
.ql-snow .ql-editor img {
  max-width: 100%;
}
.ql-snow .ql-picker {
  color: #444;
  display: inline-block;
  float: left;
  font-size: 14px;
  font-weight: 500;
  height: 24px;
  position: relative;
  vertical-align: middle;
}
.ql-snow .ql-picker-label {
  cursor: pointer;
  display: inline-block;
  height: 100%;
  padding-left: 8px;
  padding-right: 2px;
  position: relative;
  width: 100%;
}
.ql-snow .ql-picker-label::before {
  display: inline-block;
  line-height: 22px;
}
.ql-snow .ql-picker-options {
  background-color: #fff;
  display: none;
  min-width: 100%;
  padding: 4px 8px;
  position: absolute;
  white-space: nowrap;
}
.ql-snow .ql-picker-options .ql-picker-item {
  cursor: pointer;
  display: block;
  padding-bottom: 5px;
  padding-top: 5px;
}
.ql-snow .ql-picker.ql-expanded .ql-picker-label {
  color: #ccc;
  z-index: 2;
}
.ql-snow .ql-picker.ql-expanded .ql-picker-label .ql-fill {
  fill: #ccc;
}
.ql-snow .ql-picker.ql-expanded .ql-picker-label .ql-stroke {
  stroke: #ccc;
}
.ql-snow .ql-picker.ql-expanded .ql-picker-options {
  display: block;
  margin-top: -1px;
  top: 100%;
  z-index: 1;
}
.ql-snow .ql-color-picker,
.ql-snow .ql-icon-picker {
  width: 28px;
}
.ql-snow .ql-color-picker .ql-picker-label,
.ql-snow .ql-icon-picker .ql-picker-label {
  padding: 2px 4px;
}
.ql-snow .ql-color-picker .ql-picker-label svg,
.ql-snow .ql-icon-picker .ql-picker-label svg {
  right: 4px;
}
.ql-snow .ql-icon-picker .ql-picker-options {
  padding: 4px 0;
}
.ql-snow .ql-icon-picker .ql-picker-item {
  height: 24px;
  width: 24px;
  padding: 2px 4px;
}
.ql-snow .ql-color-picker .ql-picker-options {
  padding: 3px 5px;
  width: 152px;
}
.ql-snow .ql-color-picker .ql-picker-item {
  border: 1px solid transparent;
  float: left;
  height: 16px;
  margin: 2px;
  padding: 0;
  width: 16px;
}
.ql-snow .ql-picker:not(.ql-color-picker):not(.ql-icon-picker) svg {
  position: absolute;
  margin-top: -9px;
  right: 0;
  top: 50%;
  width: 18px;
}
.ql-snow
  .ql-picker.ql-header
  .ql-picker-label[data-label]:not([data-label=""])::before,
.ql-snow
  .ql-picker.ql-font
  .ql-picker-label[data-label]:not([data-label=""])::before,
.ql-snow
  .ql-picker.ql-size
  .ql-picker-label[data-label]:not([data-label=""])::before,
.ql-snow
  .ql-picker.ql-header
  .ql-picker-item[data-label]:not([data-label=""])::before,
.ql-snow
  .ql-picker.ql-font
  .ql-picker-item[data-label]:not([data-label=""])::before,
.ql-snow
  .ql-picker.ql-size
  .ql-picker-item[data-label]:not([data-label=""])::before {
  content: attr(data-label);
}
.ql-snow .ql-picker.ql-header {
  width: 98px;
}
.ql-snow .ql-picker.ql-header .ql-picker-label::before,
.ql-snow .ql-picker.ql-header .ql-picker-item::before {
  content: "Normal";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
  content: "Heading 1";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
  content: "Heading 2";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
  content: "Heading 3";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before {
  content: "Heading 4";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="5"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before {
  content: "Heading 5";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="6"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before {
  content: "Heading 6";
}
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
  font-size: 2em;
}
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
  font-size: 1.5em;
}
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
  font-size: 1.17em;
}
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before {
  font-size: 1em;
}
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before {
  font-size: 0.83em;
}
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before {
  font-size: 0.67em;
}
.ql-snow .ql-picker.ql-font {
  width: 108px;
}
.ql-snow .ql-picker.ql-font .ql-picker-label::before,
.ql-snow .ql-picker.ql-font .ql-picker-item::before {
  content: "Sans Serif";
}
.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="serif"]::before,
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="serif"]::before {
  content: "Serif";
}
.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="monospace"]::before,
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="monospace"]::before {
  content: "Monospace";
}
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="serif"]::before {
  font-family: Georgia, Times New Roman, serif;
}
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="monospace"]::before {
  font-family: Monaco, Courier New, monospace;
}
.ql-snow .ql-picker.ql-size {
  width: 98px;
}
.ql-snow .ql-picker.ql-size .ql-picker-label::before,
.ql-snow .ql-picker.ql-size .ql-picker-item::before {
  content: "Normal";
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="small"]::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="small"]::before {
  content: "Small";
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="large"]::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="large"]::before {
  content: "Large";
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="huge"]::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="huge"]::before {
  content: "Huge";
}
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="small"]::before {
  font-size: 10px;
}
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="large"]::before {
  font-size: 18px;
}
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="huge"]::before {
  font-size: 32px;
}
.ql-snow .ql-color-picker.ql-background .ql-picker-item {
  background-color: #fff;
}
.ql-snow .ql-color-picker.ql-color .ql-picker-item {
  background-color: #000;
}
.ql-code-block-container {
  position: relative;
}
.ql-code-block-container .ql-ui {
  right: 5px;
  top: 5px;
}
.ql-toolbar.ql-snow {
  border: 1px solid #ccc;
  box-sizing: border-box;
  font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  padding: 8px;
}
.ql-toolbar.ql-snow .ql-formats {
  margin-right: 15px;
}
.ql-toolbar.ql-snow .ql-picker-label {
  border: 1px solid transparent;
}
.ql-toolbar.ql-snow .ql-picker-options {
  border: 1px solid transparent;
  box-shadow: rgba(0, 0, 0, 0.2) 0 2px 8px;
}
.ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-label {
  border-color: #ccc;
}
.ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
  border-color: #ccc;
}
.ql-toolbar.ql-snow .ql-color-picker .ql-picker-item.ql-selected,
.ql-toolbar.ql-snow .ql-color-picker .ql-picker-item:hover {
  border-color: #000;
}
.ql-toolbar.ql-snow + .ql-container.ql-snow {
  border-top: 0;
}
.ql-snow .ql-tooltip {
  background-color: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 0 5px #ddd;
  color: #444;
  padding: 5px 12px;
  white-space: nowrap;
}
.ql-snow .ql-tooltip::before {
  content: "Visit URL:";
  line-height: 26px;
  margin-right: 8px;
}
.ql-snow .ql-tooltip input[type="text"] {
  display: none;
  border: 1px solid #ccc;
  font-size: 13px;
  height: 26px;
  margin: 0;
  padding: 3px 5px;
  width: 170px;
}
.ql-snow .ql-tooltip a.ql-preview {
  display: inline-block;
  max-width: 200px;
  overflow-x: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
}
.ql-snow .ql-tooltip a.ql-action::after {
  border-right: 1px solid #ccc;
  content: "Edit";
  margin-left: 16px;
  padding-right: 8px;
}
.ql-snow .ql-tooltip a.ql-remove::before {
  content: "Remove";
  margin-left: 8px;
}
.ql-snow .ql-tooltip a {
  line-height: 26px;
}
.ql-snow .ql-tooltip.ql-editing a.ql-preview,
.ql-snow .ql-tooltip.ql-editing a.ql-remove {
  display: none;
}
.ql-snow .ql-tooltip.ql-editing input[type="text"] {
  display: inline-block;
}
.ql-snow .ql-tooltip.ql-editing a.ql-action::after {
  border-right: 0;
  content: "Save";
  padding-right: 0;
}
.ql-snow .ql-tooltip[data-mode="link"]::before {
  content: "Enter link:";
}
.ql-snow .ql-tooltip[data-mode="formula"]::before {
  content: "Enter formula:";
}
.ql-snow .ql-tooltip[data-mode="video"]::before {
  content: "Enter video:";
}
.ql-snow a {
  color: #06c;
}
.ql-container.ql-snow {
  border: 1px solid #ccc;
}
`,G=C.extend({defaultProps:{__TYPE:"Editor",id:null,value:null,style:null,className:null,placeholder:null,readOnly:!1,modules:null,formats:null,theme:"snow",showHeader:!0,headerTemplate:null,onTextChange:null,onSelectionChange:null,onLoad:null,maxLength:null,children:void 0},css:{classes:Sn,styles:Cn}});function ke(r,t){var e=Object.keys(r);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(r);t&&(n=n.filter(function(l){return Object.getOwnPropertyDescriptor(r,l).enumerable})),e.push.apply(e,n)}return e}function xe(r){for(var t=1;t<arguments.length;t++){var e=arguments[t]!=null?arguments[t]:{};t%2?ke(Object(e),!0).forEach(function(n){hn(r,n,e[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(r,Object.getOwnPropertyDescriptors(e)):ke(Object(e)).forEach(function(n){Object.defineProperty(r,n,Object.getOwnPropertyDescriptor(e,n))})}return r}var Tn=(function(){try{return Quill}catch{return null}})(),Pn=q.memo(q.forwardRef(function(r,t){var e=en(),n=q.useContext(fe),l=G.getProps(r,n),o=G.setMetaData({props:l}),i=o.ptm,a=o.cx,s=o.isUnstyled;vn(G.css.styles,s,{name:"editor"});var u=q.useRef(null),c=q.useRef(null),p=q.useRef(null),f=q.useRef(null),d=q.useRef(!1),h=q.useState(!1),v=En(h,2),y=v[0],g=v[1];Pe(function(){if(!d.current){var O={modules:xe({toolbar:l.showHeader?p.current:!1},l.modules),placeholder:l.placeholder,readOnly:l.readOnly,theme:l.theme,formats:l.formats};Tn?T(new Quill(c.current,O)):_e(()=>import("./quill-CUWLWnBc.js"),__vite__mapDeps([0,1,2])).then(function(A){if(A&&M.isExist(c.current)){var w;A.default?w=new A.default(c.current,O):w=new A(c.current,O),T(w)}}),d.current=!0}});var m=function(A,w,F){var $=c.current.children[0],I=$?$.innerHTML:null,U=f.current.getText();if(I==="<p><br></p>"&&(I=null),F==="api"){var x=c.current.children[0],B=document.createElement("div");if(B.innerHTML=l.value||"",M.isEqualElement(x,B))return}if(l.maxLength){var V=f.current.getLength();V>l.maxLength&&f.current.deleteText(l.maxLength,V)}l.onTextChange&&l.onTextChange({htmlValue:I,textValue:U,delta:A,source:F})},b=function(A,w,F){l.onSelectionChange&&l.onSelectionChange({range:A,oldRange:w,source:F})},k=q.useRef(l.value);k.current=l.value;var T=function(A){f.current=A,k.current&&A.setContents(A.clipboard.convert({html:k.current,text:""})),g(!0)};Z(function(){if(y)return f.current.on("text-change",m),f.current.on("selection-change",b),function(){f.current.off("text-change",m),f.current.off("selection-change",b)}}),Z(function(){y&&f.current&&f.current.getModule("toolbar")&&l.onLoad&&l.onLoad(f.current)},[y]),Z(function(){f.current&&!f.current.hasFocus()&&(l.value?f.current.setContents(f.current.clipboard.convert({html:l.value,text:""})):f.current.setText(""))},[l.value]),q.useImperativeHandle(t,function(){return{props:l,getQuill:function(){return f.current},getElement:function(){return u.current},getContent:function(){return c.current},getToolbar:function(){return p.current}}});var _=function(){var A=e({ref:p,className:a("toolbar")},i("toolbar"));if(l.showHeader===!1)return null;if(l.headerTemplate)return q.createElement("div",A,l.headerTemplate);var w=function(I,U){return e(I&&xe({},I),i(U))},F=e({className:"ql-formats"},i("formats"));return q.createElement("div",A,q.createElement("span",F,q.createElement("select",w({className:"ql-header",defaultValue:"0"},"header"),q.createElement("option",w({value:"1"},"option"),"Heading"),q.createElement("option",w({value:"2"},"option"),"Subheading"),q.createElement("option",w({value:"0"},"option"),"Normal")),q.createElement("select",w({className:"ql-font"},"font"),q.createElement("option",w(void 0,"option")),q.createElement("option",w({value:"serif"},"option")),q.createElement("option",w({value:"monospace"},"option")))),q.createElement("span",F,q.createElement("button",w({type:"button",className:"ql-bold","aria-label":"Bold"},"bold")),q.createElement("button",w({type:"button",className:"ql-italic","aria-label":"Italic"},"italic")),q.createElement("button",w({type:"button",className:"ql-underline","aria-label":"Underline"},"underline"))),q.createElement("span",F,q.createElement("select",w({className:"ql-color"},"color")),q.createElement("select",w({className:"ql-background"},"background"))),q.createElement("span",F,q.createElement("button",w({type:"button",className:"ql-list",value:"ordered","aria-label":"Ordered List"},"list")),q.createElement("button",w({type:"button",className:"ql-list",value:"bullet","aria-label":"Unordered List"},"list")),q.createElement("select",w({className:"ql-align"},"select"),q.createElement("option",w({defaultValue:!0},"option")),q.createElement("option",w({value:"center"},"option")),q.createElement("option",w({value:"right"},"option")),q.createElement("option",w({value:"justify"},"option")))),q.createElement("span",F,q.createElement("button",w({type:"button",className:"ql-link","aria-label":"Insert Link"},"link")),q.createElement("button",w({type:"button",className:"ql-image","aria-label":"Insert Image"},"image")),q.createElement("button",w({type:"button",className:"ql-code-block","aria-label":"Insert Code Block"},"codeBlock"))),q.createElement("span",F,q.createElement("button",w({type:"button",className:"ql-clean","aria-label":"Remove Styles"},"clean"))))},R=_(),W=e({ref:c,className:a("content"),style:l.style},i("content")),H=q.createElement("div",W),z=e({className:ee(l.className,a("root"))},G.getOtherProps(l),i("root"));return q.createElement("div",ce({id:l.id,ref:u},z),R,H)}));Pn.displayName="Editor";export{Pn as Editor};
