var jsonrpclib=require('..');
var assert=require('assert');

function _getCodeOrResult(jsonStr, code) {
  if(!jsonStr) return jsonStr;
  try {
    var obj = JSON.parse(jsonStr);
    return obj.error ? obj.error.code : obj.result;
  }
  catch(err) {
    // json has to be valid in all cases
    throw Error('Invalid JSON');
  }
}

var PARSE_ERROR = -32700;
var INVALID_REQUEST = -32600;
var METHOD_NOT_FOUND = -32601;
var INVALID_PARAMS = -32602;


describe('json-rpc library', function() {
  before(function(done) {
    done();
  });
  var testModules = {
    add: function(a,b) { return a+b; },
    subtract: function(a,b) { return a-b; },
    name: 'test module'
  };
  var debug=false;
  describe('basic variants', function() {
    it('syntax', function(done) {
      var rpc=new jsonrpclib(testModules,debug);
      var res;
      res=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1');
      assert.equal(_getCodeOrResult(res), PARSE_ERROR);

      res=rpc.request('[]');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=rpc.request('{}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=rpc.request('{"id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=rpc.request('{"jsonrpc":"1.2"}');
      assert.equal(_getCodeOrResult(res), undefined);

      res=rpc.request('{"jsonrpc":"1.2", "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=rpc.request('{"jsonrpc":"2.0"}');
      assert.equal(_getCodeOrResult(res), undefined);

      res=rpc.request('{"jsonrpc":"2.0", "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=rpc.request('{"jsonrpc":"2.0", "id":[1]}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      done();

    });
    it('method', function(done) {
      var rpc=new jsonrpclib(testModules,debug);
      var res;
      res=rpc.request('{"jsonrpc":"2.0", "params":[1,2], "id":123}'); // method missing
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=rpc.request('{"jsonrpc":"2.0", "mehod":"subtract", "params":[1,2], "id":1}'); // method missing
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=rpc.request('{"jsonrpc":"2.0", "method":"sub", "params":[1,2], "id":1}'); // method unknown
      assert.equal(_getCodeOrResult(res), METHOD_NOT_FOUND);

      res=rpc.request('{"jsonrpc":"2.0", "method":"name", "params":[1,2], "id":1}'); // not a method
      assert.equal(_getCodeOrResult(res), METHOD_NOT_FOUND);
      done();
    });
    it('params', function(done) {
      var rpc=new jsonrpclib(testModules,debug);
      var res;
      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":23, "id":1}'); // invalid param
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":"2,3", "id":1}'); // invalid param
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[5,2], "id":1}');
      assert.equal(_getCodeOrResult(res), 3);

      // params should match
      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[5,2,3], "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[], "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":[5], "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"a":10}, "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"a":10,"x":3}, "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"a":10,"b":3,"c":34}, "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"subtract", "params":{"b":3,"a":34}, "id":1}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=rpc.request('{"jsonrpc":"2.0", "method":"add", "params":{"b":3,"a":34}, "id":1}');
      assert.equal(_getCodeOrResult(res), METHOD_NOT_FOUND);

      // valid
      res=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}');
      assert.equal(_getCodeOrResult(res), 19);

      done();
    });
    // batch tests
    it('batch', function(done) {
      var rpc=new jsonrpclib(testModules,debug);
      var res;
      res=rpc.request('[{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1},{"sample":"value"}]');
      var obj=JSON.parse(res);
      assert.equal(obj.length, 1);
      assert.equal(obj[0].result, 19);

      res=rpc.request('[{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1},{"method":"subtract","id":23}]');
      obj=JSON.parse(res);
      assert.equal(obj.length, 2);
      assert.equal(obj[0].result, 19);
      assert.equal(obj[1].error.code, INVALID_PARAMS);
      done();
    });

  });

  // lets copy & paste all the examples from rpc spec page
  testModules = {
    sum: function(a,b,c) { return a+b+c; },
    subtract: function(minuend,subtrahend) { return minuend-subtrahend; },
    get_data: function() { return ['hello',5]; }
  };
  describe('rpc spec examples', function() {
    var rpc=new jsonrpclib(testModules,debug);
    var res;
    it('rpc call with positional parameters', function(done) {
      res=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}');
      assert.equal(_getCodeOrResult(res), 19);
      res=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [23, 42], "id": 2}');
      assert.equal(_getCodeOrResult(res), -19);
      done();
    });
    it('rpc call with named parameters', function(done) {
      res=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}');
      assert.equal(_getCodeOrResult(res), 19);
      res=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": {"minuend": 42, "subtrahend": 23}, "id": 4}');
      assert.equal(_getCodeOrResult(res), 19);
      done();
    });
    it('a Notification', function(done) {
      res=rpc.request('{"jsonrpc": "2.0", "method": "update", "params": [1,2,3,4,5]}');
      assert.equal(_getCodeOrResult(res), undefined);
      res=rpc.request('{"jsonrpc": "2.0", "method": "foobar"}');
      assert.equal(_getCodeOrResult(res), undefined);
      done();
    });
    it('rpc call of non-existent method', function(done) {
      res=rpc.request('{"jsonrpc": "2.0", "method": "foobar", "id":1}');
      assert.equal(_getCodeOrResult(res), METHOD_NOT_FOUND);
      done();
    });
    it('rpc call with invalid JSON', function(done) {
      res=rpc.request('{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]');
      assert.equal(_getCodeOrResult(res), PARSE_ERROR);
      done();
    });
    it('rpc call with invalid Request object', function(done) {
      res=rpc.request('{"jsonrpc": "2.0", "method": 1, "params": "bar"}');
      assert.equal(_getCodeOrResult(res), undefined);
      done();
    });
    it('rpc call Batch, invalid JSON', function(done) {
      res=rpc.request('[ {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},{"jsonrpc": "2.0", "method"');
      assert.equal(_getCodeOrResult(res), PARSE_ERROR);
      done();
    });
    it('rpc call with an invalid Batch (but not empty)', function(done) {
      res=rpc.request('[1]');
      var obj=JSON.parse(res);
      assert.equal(obj.length, 1);
      assert.equal(obj[0].error.code, INVALID_REQUEST);
      done();
    });
    it('rpc call with invalid Batch', function(done) {
      res=rpc.request('[1,2,3]');
      var obj=JSON.parse(res);
      assert.equal(obj.length, 3);
      assert.equal(obj[0].error.code, INVALID_REQUEST);
      assert.equal(obj[1].error.code, INVALID_REQUEST);
      assert.equal(obj[2].error.code, INVALID_REQUEST);
      done();
    });
    it('rpc call Batch', function(done) {
      res=rpc.request('[{"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},'
                      + '{"jsonrpc": "2.0", "method": "notify_hello", "params": [7]},'
                      + '{"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"},'
                      + '{"foo": "boo"},'
                      + '{"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"}, '
                      + '{"jsonrpc": "2.0", "method": "get_data", "id": "9"} '
                      + ']');
      var obj=JSON.parse(res);
      assert.equal(obj.length, 4);
      // order might not be preserved in actuality
      assert.equal(obj[0].result,7);
      assert.equal(obj[1].result,19);
      assert.equal(obj[2].error.code, METHOD_NOT_FOUND);
      assert.equal(obj[3].id, "9");
      done();
    });
    it('rpc call Batch (all notifications)', function(done) {
      res=rpc.request('[ '
                    + '{"jsonrpc": "2.0", "method": "notify_sum", "params": [1,2,4]}, '
                    + '{"jsonrpc": "2.0", "method": "notify_hello", "params": [7]} '
                    + ']');
      assert.equal(_getCodeOrResult(res), undefined);
      done();
    });

  });


});
