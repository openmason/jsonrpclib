[![build status](https://secure.travis-ci.org/openmason/jsonrpclib.png)](http://travis-ci.org/openmason/jsonrpclib)
# json rpc library
json rpc 2.0 server library.
For a ready to use ZeroMQ-JSON-RPC server, please refer to https://github.com/openmason/zmqrpc

# Features
 * full implementation of json rpc 2.0 spec (see the spec http://www.jsonrpc.org/specification for details)
 * support for both positional and named arguments
 * support for batch request/response

# Usage
Please refer to test directory for full suite of test cases and how to use.

    # define a simple module
    var MyService = {
      add:      function(a,b) { return a+b; },
      subtract: function(a,b) { return a-b; }
    };
    
    var jsonrpclib=require('jsonrpclib');
    var rpc = new jsonrpclib(MyService);
    
    // call the service
    res=rpc.request('{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}');
    // res is a json string and would be like
    // {"jsonrpc":"2.0","result":19,"id":"1"}

# Tests
Full set of test cases can be found in test directory. To run tests just issue `make test`
    
