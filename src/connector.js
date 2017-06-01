'use strict'

const events = require('events')

const couchbase = require('couchbase');
var couchnode = require('couchnode');

const pckg = require('../package.json')

/**
 * This class connects deepstream.io to a couchbase cache, using the
 * couchbase + couchnode libraries.
 *
 * lifetime is the default lifetime for objects in seconds (defaults to 1000)
 *
 * @param {Object} options { serverLocation: <mixed>, [lifetime]: <Number>, [memcachedOptions]: <Object> }
 *
 * @constructor
 */
class Connector extends events.EventEmitter {
  constructor(options) {
    super(options)
    this.isReady = false
    this.name = pckg.name
    this.version = pckg.version
    this._options = options
    this._options.lifetime = options.lifetime || 1000

    if (!this._options.host) {
      throw new Error('Missing parameter \'host\' for couchbase connector')
    }

    var me = this;

    console.log('couchbase options: ', this._options);

    this._cluster = new couchbase.Cluster(this._options.host);
    this._bucket = this._cluster.openBucket(this._options.bucketname || 'deepstream', this._options.password);
    this._ready();
    
    // function connectBucket() {    
    //   me._bucket.bucket.on('error', err => {
    //     // console.log('Error connecting to bucket: ', me._bucket.bucket);
    //     me.emit('error', err);
    //   });

    //   me._bucket.bucket.on('connect', () => {
    //     // console.log('Connected to the bucket!');
    //     me._ready();
    //   });
    // }

    // setTimeout(connectBucket, 1000);
  }

  /**
   * Writes a value to the cache.
   *
   * @param {String}   key
   * @param {Object}   value
   * @param {Function} callback Should be called with null for successful set operations or with an error message string
   *
   * @private
   * @returns {void}
   */
  set(key, value, callback) {
    var tuples = {};
    tuples[key] = value;

    this._bucket.upsert(tuples, this._onResponse.bind(this, callback));
    //this._client.set(key, value, this._options.lifetime, this._onResponse.bind(this, callback))
  }

  /**
   * Retrieves a value from the cache
   *
   * @param {String}   key
   * @param {Function} callback Will be called with null and the stored object
   *                            for successful operations or with an error message string
   *
   * @private
   * @returns {void}
   */
  get(key, callback) {

    this._bucket.get(key, (err, val) => {
      if(err)
        return callback(err);

      if(val === undefined || val[key] === undefined)
        return callback(null, null);

      callback(null, val[key]);
    });

/*    this._client.get(key, (err, value) => {
      if (err) {
        callback(err)
        return
      }

      if (value === undefined) {
        callback(null, null)
        return
      }
      callback(null, value)
    })
*/
  }

  /**
   * Deletes an entry from the cache.
   *
   * @param   {String}   key
   * @param   {Function} callback Will be called with null for successful deletions or with
   *                     an error message string
   *
   * @private
   * @returns {void}
   */
  delete(key, callback) {
    this._bucket.remove(key, (err, cas, misses) => {
      if(err)
        return callback(err);

      callback(null);
    });
//    this._client.del(key, this._onResponse.bind(this, callback))
  }

  _ready() {
    this.isReady = true
    this.emit('ready')
  }

  _onResponse(callback, error) {
    if (error) {
      callback(error)
    } else {
      callback(null)
    }
  }
}

module.exports = Connector
