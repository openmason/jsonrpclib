/**
 * jsonrpclib - main file
 * copyright (c) 2012 openmason.
 * MIT Licensed.
 */

var handy = require('handy');
var logger = require('util');
var _ = require('underscore');

// The rpc specification can be found at:
// - http://www.jsonrpc.org/specification
// - http://en.wikipedia.org/wiki/JSON-RPC

/*
 * Syntax:
 * 
 * --> data sent to Server
 * <-- data sent to Client
 * 
 * rpc call with positional parameters:
 * 
 * --> {"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}
 * <-- {"jsonrpc": "2.0", "result": 19, "id": 1}
 * 
 * --> {"jsonrpc": "2.0", "method": "subtract", "params": [23, 42], "id": 2}
 * <-- {"jsonrpc": "2.0", "result": -19, "id": 2}
 * 
 * rpc call with named parameters:
 * 
 * --> {"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}
 * <-- {"jsonrpc": "2.0", "result": 19, "id": 3}
 * 
 * --> {"jsonrpc": "2.0", "method": "subtract", "params": {"minuend": 42, "subtrahend": 23}, "id": 4}
 * <-- {"jsonrpc": "2.0", "result": 19, "id": 4}
 * 
 * a Notification:
 * 
 * --> {"jsonrpc": "2.0", "method": "update", "params": [1,2,3,4,5]}
 * --> {"jsonrpc": "2.0", "method": "foobar"}
 * 
 * rpc call of non-existent method:
 * 
 * --> {"jsonrpc": "2.0", "method": "foobar", "id": "1"}
 * <-- {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found."}, "id": "1"}
 * 
 * rpc call with invalid JSON:
 * 
 * --> {"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]
 * <-- {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error."}, "id": null}
 * 
 * rpc call with invalid Request object:
 * 
 * --> {"jsonrpc": "2.0", "method": 1, "params": "bar"}
 * <-- {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request."}, "id": null}
 * 
 * rpc call Batch, invalid JSON:
 * 
 * --> [
 *   {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},
 *   {"jsonrpc": "2.0", "method"
 * ]
 * <-- {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error."}, "id": null}
 * rpc call with an empty Array:
 * --> []
 * <-- {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request."}, "id": null}
 * rpc call with an invalid Batch (but not empty):
 * --> [1]
 * <-- [
 *   {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request."}, "id": null}
 * ]
 * 
 * rpc call with invalid Batch:
 * 
 * --> [1,2,3]
 * <-- [
 *   {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request."}, "id": null},
 *   {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request."}, "id": null},
 *   {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request."}, "id": null}
 * ]
 * 
 * rpc call Batch:
 * 
 * --> [
 *         {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},
 *         {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]},
 *         {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"},
 *         {"foo": "boo"},
 *         {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"},
 *         {"jsonrpc": "2.0", "method": "get_data", "id": "9"} 
 *     ]
 * <-- [
 *         {"jsonrpc": "2.0", "result": 7, "id": "1"},
 *         {"jsonrpc": "2.0", "result": 19, "id": "2"},
 *         {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request."}, "id": null},
 *         {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found."}, "id": "5"},
 *         {"jsonrpc": "2.0", "result": ["hello", 5], "id": "9"}
 *     ]
 * 
 * rpc call Batch (all notifications):
 * 
 * --> [
 *         {"jsonrpc": "2.0", "method": "notify_sum", "params": [1,2,4]},
 *         {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]}
 *     ]
 * <-- //Nothing is returned for all notification batches
 * 
 */

var RpcErrors = {
  PARSE_ERROR     : { code:-32700, message: 'Parse error' },
  INVALID_REQUEST : { code:-32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code:-32601, message: 'Method not found' },
  INVALID_PARAMS  : { code:-32602, message: 'Invalid params' },
  INTERNAL_ERROR  : { code:-32603, message: 'Internal error' },
  SERVER_ERROR    : { code:-32000, message: 'Server error' }
};

// JSON RPC library entry point
var JSONRpc = function(module, debug) {
  this.debug = debug || false;
  this.jsonrpc = "2.0";
  // check & load the methods in module
  this.methods = module;
  if(handy.getType(module)=='string') {
    this.methods = require(module);
  }
  if(this.debug) {
    logger.debug('Loaded with methods:'+_.functions(this.methods));
  }
};

// main dispatcher for processing json-rpc
// requests
JSONRpc.prototype.request = function(jsonBody) {
  var self=this;
  self._debug(true, jsonBody);

  var id = null;
  var batch = false;
  var rpcObj;
  // first step is to parse the json
  try {
    rpcObj = JSON.parse(jsonBody);
  } catch(err) {
    return JSON.stringify(self.error(RpcErrors.PARSE_ERROR, id, err.message));
  }
  var requests = [];
  var results = [];
  // if rpcObj is array, then its a batch request
  if(handy.getType(rpcObj)=='array') {
    if(rpcObj.length==0) {
      return JSON.stringify(self.error(RpcErrors.INVALID_REQUEST, id));
    }
    batch = true;
    requests = rpcObj;
  } else {
    requests = [rpcObj];
  }
  // handle all the requests
  // 1. try to validate each of the request
  // 2. run them
  _.each(requests, function(reqObj) {
    // - first drop off all the requests without id
    //   those are notifications.
    if(handy.getType(reqObj)=='object' && _.size(reqObj)>0 && !_.has(reqObj, 'id')) {
      self._debug(true, 'Notification ' + JSON.stringify(reqObj));
    } else {
      var result = self._validate(reqObj);
      if(!result) {
        // invoke the function
        // @todo - what should be the value of 'this'?
        try {
          var res=self.methods[reqObj.method].apply(null, reqObj.params);
          result = self.result(reqObj.id, res);
        }
        catch(err) {
          result = self.error(RpcErrors.INTERNAL_ERROR, reqObj.id, err);
        }
      }
      results.push(result);
    }
  });
  // return back the result
  if(results.length<=0) return;
  if(batch==false) {
    return JSON.stringify(results[0]);
  } 
  return JSON.stringify(results);
};

// return back the result object
JSONRpc.prototype.result = function(id, result) {
  var res = { jsonrpc: this.jsonrpc,
              result: result,
              id: id };
  this._debug(false, res);
  return res;
};


// return back the correct error object
JSONRpc.prototype.error = function(err, id, data) {
  var errorObj = { jsonrpc: this.jsonrpc,
                   error: { code: err.code, message: err.message },
                   id: id };
  if(data) {
    errorObj['data'] = data;
  }
  this._debug(false, errorObj);
  return errorObj;
};

// ---- private functions

// validate the request object
// - returns the error object, if any error
JSONRpc.prototype._validate = function(requestObj) {
  var self = this;
  // - check for jsonprc value
  if(_.has(requestObj, 'jsonrpc') && requestObj['jsonrpc']!='2.0') {
    return self.error(RpcErrors.INVALID_REQUEST, requestObj.id, 'unknown jsonrpc version');
  }
  // - check for id
  var idType = handy.getType(requestObj.id);
  if(idType != 'string' && idType != 'number') {
    return self.error(RpcErrors.INVALID_REQUEST, requestObj.id, 'id should be a valid number/string');
  }
  // - check for method
  if(!_.has(requestObj, 'method')) {
    return self.error(RpcErrors.INVALID_REQUEST, requestObj.id, 'missing method to call');
  }
  // - check if method is present
  var fns = _.functions(self.methods);
  if(!_.include(fns, requestObj.method)) {
    return self.error(RpcErrors.METHOD_NOT_FOUND, requestObj.id, requestObj.method + " - unknown method");
  }

  // - parameter checks
  var params=_getParamNames(self.methods[requestObj.method]) || [];
  // - if params are absent and required for the method, its an error
  if(!_.has(requestObj,'params') && params && params.length>0) {
    return self.error(RpcErrors.INVALID_PARAMS, requestObj.id, 'params expected:'+params);
  }
  // - if params are present
  //   it has to be either array or object
  if(_.has(requestObj, 'params')) {
    var ptype = handy.getType(requestObj.params);
    if(ptype!='array' && ptype!='object') {
      return self.error(RpcErrors.INVALID_PARAMS, requestObj.id, 'params should be either array or object');
    }

    // @todo - not sure if this check needs to be enabled
    // sometimes it might be by design that less valus can be passed

    // check if array matches the arguments
    if(ptype=='array' && requestObj.params.length != params.length) {
      return self.error(RpcErrors.INVALID_PARAMS, requestObj.id, 'total params expected:'+params.length);
    }
    // check if the object has matching params
    if(ptype=='object') {
      var requestValues = _.keys(requestObj.params);
      if(!handy.isArrayEqual(params, requestValues)) {
        return self.error(RpcErrors.INVALID_PARAMS, requestObj.id, 'params expected:'+params);
      }
      // lets convert the params to array 
      // in the order expected
      requestObj.params = _.values(_.pick(requestObj.params, params));
    }
  }
};

// returns the function parameters
function _getParamNames(func) {
  var funStr = func.toString();
  return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
}

// debug request/response statements
JSONRpc.prototype._debug = function(isRequest, value) {
  if(this.debug) {
    if(handy.getType(value)!='string') {
      value = JSON.stringify(value);
    }
    logger.debug((isRequest?'-->':'<--')+' ' + value);
  }
};

module.exports = JSONRpc;

// -- EOF