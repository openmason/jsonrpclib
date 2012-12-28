var jsonrpclib=require('..');
var assert=require('assert');

// nothing for now
/*
 * Request
   * jsonrpc - "2.0"
   * method 
 * Response
 * Batch
*/
describe('basic', function() {
  before(function(done) {
    done();
  });
  var testModules = {
    add: function(a,b) { return a+b; },
    subtract: function(a,b) { return a-b; },
    name: 'test module'
  };
  var rpc=new jsonrpclib(testModules);
  rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1');
  rpc.request('[]');
  rpc.request('{}');
  rpc.request('{id:1}');
  rpc.request('{"jsonrpc":"1.2"}');
  rpc.request('{"jsonrpc":"1.2", "id":1}');
  rpc.request('{"jsonrpc":"2.0"}');
  rpc.request('{"jsonrpc":"2.0", "id":1}');
  rpc.request('{"jsonrpc":"2.0", "id":[1]}');
  rpc.request('{"jsonrpc":"2.0", "params":[1,2], "id":123}'); // method missing
  rpc.request('{"jsonrpc":"2.0", "mehod":"subtract", "params":[1,2], "id":1}'); // method missing
  rpc.request('{"jsonrpc":"2.0", "method":"sub", "params":[1,2], "id":1}'); // method unknown
  rpc.request('{"jsonrpc":"2.0", "method":"name", "params":[1,2], "id":1}'); // not a method
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":23, "id":1}'); // invalid param
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":"2,3", "id":1}'); // invalid param
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[5,2], "id":1}');
  // params should match
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[5,2,3], "id":1}');
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[], "id":1}');
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[5], "id":1}');
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"a":10}, "id":1}');
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"a":10,"x":3}, "id":1}');
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"a":10,"b":3,"c":34}, "id":1}');
  rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"b":3,"a":34}, "id":1}');
  rpc.request('{"jsonrpc":"2.0", "method":"add", "params":{"b":3,"a":34}, "id":1}');
  
  //
  rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}');
  // batch tests
  var r=rpc.request('[{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1},{"sample":"value"}]');
  r=rpc.request('[{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1},{"method":"subtract","id":23}]');
  console.log(r);

  // lets copy & paste all the examples
  testModules = {
    sum: function(a,b,c) { return a+b+c; },
    subtract: function(minuend,subtrahend) { return minuend-subtrahend; },
    get_data: function() { return ['hello',5]; }
  };
  rpc=new jsonrpclib(testModules);

  // from the spec here
  // rpc call with positional parameters
  r=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}');
  console.log(r);
  r=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [23, 42], "id": 2}');
  console.log(r);

  // rpc call with named parameters
  r=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}');
  console.log(r);
  r=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": {"minuend": 42, "subtrahend": 23}, "id": 4}');
  console.log(r);

  // a Notification:
  r=rpc.request('{"jsonrpc": "2.0", "method": "update", "params": [1,2,3,4,5]}');
  console.log(r);
  r=rpc.request('{"jsonrpc": "2.0", "method": "foobar"}');
  console.log(r);

  // rpc call of non-existent method:
  r=rpc.request('{"jsonrpc": "2.0", "method": "foobar", "id": "1"}');
  console.log(r);

  // rpc call with invalid JSON:
  r=rpc.request('{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]');
  console.log(r);

  // rpc call with invalid Request object:
  r=rpc.request('{"jsonrpc": "2.0", "method": 1, "params": "bar"}');
  console.log(r);

  // rpc call Batch, invalid JSON:
  r=rpc.request('[ {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},{"jsonrpc": "2.0", "method"');
  console.log(r);

  // rpc call with an invalid Batch (but not empty):
  r=rpc.request('[1]');
  console.log(r);

  // rpc call with invalid Batch:
  r=rpc.request('[1,2,3]');
  console.log(r);

  // rpc call Batch:
  r=rpc.request('[{"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},'
                + '{"jsonrpc": "2.0", "method": "notify_hello", "params": [7]},'
                + '{"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"},'
                + '{"foo": "boo"},'
                + '{"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"}, '
                + '{"jsonrpc": "2.0", "method": "get_data", "id": "9"} '
                + ']');
  console.log(r);

  // rpc call Batch (all notifications):
  r=rpc.request('[ '
                + '{"jsonrpc": "2.0", "method": "notify_sum", "params": [1,2,4]}, '
                + '{"jsonrpc": "2.0", "method": "notify_hello", "params": [7]} '
                + ']');
  console.log(r);

});
