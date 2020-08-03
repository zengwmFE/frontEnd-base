### 单例模式(Singleton)
> 限制了类的实例化次数只能一次。从经典意义来将，单例模式，**在实例不存在的时候，可以通过一个方法创建一个类来实现创建类的新实例；如果实例已经存在，他会简单返回该对象的引用**。单例模式不同于**静态类**，**可以推迟它们的初始化**，这通常是因为我们需要一些信息，而这些信息在初始化的时候可能无法获取到；对于没有擦觉到之前引用的代码，不会提供方便检索的方法
优点： 能够单独划分出一个命名空间，避免和别的内部变量发生冲突，所以单例可以分为简单单例和闭包单例

项目的实际用途：
1. 简单单例
```
// 判断实例是否存在，存在则返回，不存在则创建，这样可以保证一个类只有一个实例对象
var testSingle = testSingle||{
    name: 'jack',
    age: 15,
    gender: '1',
    sayName: function(){
        console.log(this.name)
    },
    sayAge: function(){
        console.log(this.age)
    }
}
```

2. 闭包单例

```
// 闭包的作用是保护一些私有属性，不被外界访问，只有return将属性暴露才能被外界访问到
var testSingle = testSingle||{
    introduction = (function(){
        var _name = 'jack'
        var _age = 15
        var _gender = '1'
        var _sayName = function(){
            console.log(_name)
        }
        var _sayAge = function(){
            console.log(_age)
        }
        return {
            name: _name,
            age: _age,
            gender: _gender,
            sayName: function(){
                return _sayName();
            },
            sayAge: function(){
                return _sayAge()
            }
        }
    }
}
```
#### 应用场景
1. 弹窗，无论点击多少次，弹窗只应该被创建一次；
2. 全局缓存
3. `vuex`创建全局的`store`


### 工厂模式

> Factory模式是一种创建型模式，涉及到创建对象的概念。其分类不同于其他模式的地方在于它不显式地要求使用一个构造函数。而`Factory`可以提供一个通用的接口来创建对象，我们可以指定我们所希望创建的工厂对象类型

```
// 一个简单的工厂
function PersonFactory(name) { // 工厂函数
  let obj = new Object();
  obj.name = name;    
  obj.sayName = function(){
      return this.name;
  }
  return obj;
}
let person = new PersonFactory("张三");

console.log(person.name); // 张三
console.log(person.sayName()); // 张三
```
#### 应用场景
1. 创建工具库，导出有且只有一个的引用如：`jquery`可以使用`$ `,`lodash`可以使用`_`
2. 类似React.createElement，屏蔽了开发者直接使用new VNode，符合开放封闭原则，VNode的实现对开发者不可见

### 观察者模式
> 一个对象（称为subject）维持一系列依赖于它(观察者)的对象，将有关状态的任何变更自动通知给他们
观察者模式一般使用**Publish/Subscribe模式的变量来实现**
```
const event = {
  registerList: [],
  register: (key, fn) => {
    if(typeof fn !== 'function') {
      console.log('请添加函数');
      return;
    }
    if(!this.registerList[key]) {
      this.registerList[key] = [];
    }
    this.registerList.push(fn);
  },
  trigger(key, ...rest) {
    const funList = this.registerList[key];
    if(!(funList &&funList.length)) {
      return false;
    }
    funList.forEach(fn => {
      fn.apply(this.rest);
    });
  }
}

event.register('click', () => {console.log('我订阅了')});
event.register('click', () => {console.log('我也订阅了')});
event.trigger('click');
```

#### 应用场景
1. onClick的事件绑定
2. vue中的watch