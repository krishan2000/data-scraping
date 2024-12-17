var mysql = require('mysql');
var Bluebird = require('bluebird');
var Promise = require('promise');

var connection = Bluebird.promisifyAll(mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "events"
}));


connection.connect(function (err) {
    if (err)
        console.log(err);
        // throw err;
    console.log("Connected!");
});

module.exports.insertData = function (table_name, postObj) {
    return new Promise((resolve, reject) => {
        var sql = "INSERT INTO " + table_name + " SET ?";
        var query = connection.query(sql, postObj, function (error, response) {
            if (error) {
                console.log("db error:" +  error);
                reject(error);
            } else {
                //resolve(response);
                if (response.insertId > 0) {
                    resolve(response);
                } else {
                    reject("Something went wrong");
                }
            }
        });
        //console.log(query.sql); 
    });
};

module.exports.getWhere = function (table_name, where = null) {
    return new Promise((resolve, reject) => {
        if (where == null)
            var sql = "select * from " + table_name;
        else
            var sql = "select * from " + table_name + " where " + where;
        var query = connection.query(sql, function (error, response) {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

module.exports.dbQuery = function (sql_query) {
    return new Promise((resolve, reject) => {
        var query = connection.query(sql_query, function (error, response) {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

module.exports.getCountOfRecords = function (sql_query) {
    return new Promise((resolve, reject) => {
        var query = connection.query(sql_query, function (error, response) {
            if (error) {
                reject(error);
            } else {
                resolve(response.length);
            }
        });
    });
};

module.exports.updateWhere = function (table_name, updateData, where = null) {
    return new Promise((resolve, reject) => {
        if (where != null)
            var sql = "update " + table_name + " SET ? where " + where;
        else
            var sql = "update " + table_name + " SET ?";
        var query = connection.query(sql, updateData, function (error, response) {
            if (error) {
                reject(error);
            } else {
                if (response.affectedRows > 0) {
                    resolve(true);
                } else {
                    reject("Something went wrong");
                }
            }
        });
        //console.log(query.sql);
    });
};