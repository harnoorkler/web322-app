const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bcrypt = require('bcryptjs');

const userSchema = new Schema({
    userName: {
        "type": String,
        "unique": true
    },
    "password": String,
    "email": String,
    "loginHistory": [{
        "dateTime": Date,
        "userAgent": String
    }]
})

let User;

module.exports.initialize = function () {
    return new Promise((resolve, reject) => {
        const db = mongoose.createConnection("mongodb+srv://dbuser:harnoorkler@senecaweb.jcmxjdl.mongodb.net/?retryWrites=true&w=majority");
        db.on('error', (err) => {
            reject(err);
        });
        db.once('open', () => {
            User = db.model('users', userSchema);
            resolve();
        });
    });
};

module.exports.registerUser = function (userData) {
    return new Promise((resolve, reject) => {
        if (userData.password == userData.password2) {
            bcrypt.hash(userData.password, 10)
                .then((hash) => {
                    userData.password = hash;

                    let newUser = new User(userData).save()
                        .then(() => {
                            resolve();
                        })
                        .catch((err) => {
                            if (err.code == 11000) {
                                reject("User Name already taken.");
                            }
                            else {
                                reject("There was an error creating the user: " + err);
                            }
                        });
                })
                .catch((err) => {
                    reject("There was an error encrypting the password");
                })
        }
        else {
            reject("Passwords do not match");
        }
    });
}

module.exports.checkUser = function (userData) {
    return new Promise((resolve, reject) => {
        User.find({ userName: userData.userName }).exec()
            .then((users) => {
                if (users.length != 0) {
                    bcrypt.compare(userData.password, users[0].password)
                        .then((result) => {
                            if (result != false) {
                                users[0].loginHistory.push({
                                    "dateTime": (new Date()).toString(),
                                    "userAgent": userData.userAgent
                                });

                                User.updateOne({
                                    userName: users[0].userName,
                                    $set: { loginHistory: users[0].loginHistory }
                                }).exec()
                                    .then(() => {
                                        resolve(users[0]);
                                    })
                                    .catch((err) => {
                                        reject("There was an error verifying user: " + err);
                                    })
                            }
                            else {
                                reject("Inccorect password for user: " + userData.userName);
                            }
                        })
                        .catch((err) => {
                            console.log(err);
                            reject(err);
                        })
                }
                else {
                    reject("Unable to find user: " + userData.userName);
                }
            })
            .catch((err) => {
                reject("Unable to find user: " + userData.userName);
            })
    });
}

