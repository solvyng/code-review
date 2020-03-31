const AWS = require('aws-sdk');
const req = require('request');
exports.handler = (event, context, callback) => {
    let phone_number;
    let ccode;
    let dob;
    let custusername;
    let currentStage = 'uat';
    let UserPoolId;
    if(event['stage'])
    {
    currentStage = event['stage'];    
    }
    var request = event.body;
    if(request.phone_number)
      {
          phone_number = request.phone_number;
          if(phone_number.length > 10 )
          {
               let res = {
                message: "InvalidParameterException-phone number",
                statusCode: 402
                 };
                 console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
                 callback(null, res);
                 return;
          }
   
     }
     else
     {
          let res = {
                message: "InvalidParameterException-phone number",
                statusCode: 402
         };
         console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
         callback(null, res);
         return;
     }
     if(request.ccode)
      {
          
          ccode = request.ccode;
          if(ccode.length > 3 )
          {
               let res = {
                message: "InvalidParameterException-ccode",
                statusCode: 402
                 };
                 console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
                 callback(null, res);
                 return;
          }
   
     }
     else
     {
          let res = {
                message: "InvalidParameterException-ccode",
                statusCode: 402
         };
         console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
         callback(null, res);
         return;
     }
      if(request.dob)
     {
        dob = request.dob;
        //var pattern = /^((0[1-9]|[12][0-9]|3[01])(\/)(0[13578]|1[02]))|((0[1-9]|[12][0-9])(\/)(02))|((0[1-9]|[12][0-9]|3[0])(\/)(0[469]|11))(\/)\d{4}$/;
        var pattern = /^\d\d\d\d-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])$/;
        if(!pattern.test(dob))
        {
            let res = {
                message: "InvalidParameterException-dob",
                statusCode: 402
            };
            console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
            callback(null, res);
            return;
        }
        
     }
     else
     {
          let res = {
                message: "InvalidParameterException-dob",
                statusCode: 402
         };
         console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
         callback(null, res);
         return;
     }
    if(currentStage == 'dev')
    {
        UserPoolId = process.env.DevUserPoolId;
    }
    else if(currentStage == 'uat')
    {
        UserPoolId = process.env.UATUserPoolId;
    }
    else if(currentStage == 'prod')
    {
        UserPoolId = process.env.ProdUserPoolId;
    }
    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
     var filter = "phone_number = \"" + "+" + ccode + phone_number + "\"";
    var params = {
        "Filter": filter,
        "UserPoolId": UserPoolId
    };
    cognitoidentityserviceprovider.listUsers(params, function(err, data) {
        if (err) {
            console.log(err);
            let res = {
                message: err.message,
                statusCode: err.statusCode
            };
            console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
            callback(null, res);
            return;
        }
        else {
            if(data && data.Users[0])
            {
                 let status;
                 var statusObject = search('custom:status', data.Users[0].Attributes);
                        if (statusObject) {
                            status = statusObject.Value;
                        }
            custusername = data.Users[0].Username;
            if (data.Users[0].UserStatus == "CONFIRMED" || status == "Forgot-Username" || status == "Forgot-Password") {
                let cdob;
                var dobObject = search('birthdate', data.Users[0].Attributes);
                if (dobObject) {
                    cdob = dobObject.Value;
                }
                if (cdob && cdob == dob) {
                    let answer = Math.random().toString(10).substr(2, 4);
                    let UserAttributes = [];
                    let otp = {
                        "Name": 'custom:OTP',
                        "Value": answer
                    };
                    let OTPupdatedTime = {
                        "Name": 'custom:OTPupdatedTime',
                        "Value": Date.now().toString()
                    };
                    if(data.Users[0].UserStatus != "CONFIRMED")
                    {
                        let userstatus = {
                            "Name": 'custom:status',
                            "Value": 'Forgot-Username'
                        };
                        UserAttributes.push(userstatus);
                    }
                    UserAttributes.push(otp);
                    UserAttributes.push(OTPupdatedTime);
                   
                    let updateparams = {
                        UserPoolId: UserPoolId,
                        Username: custusername,
                        UserAttributes: UserAttributes
                    };
                    cognitoidentityserviceprovider.adminUpdateUserAttributes(updateparams, function(err, data) {
                        if (err) {
                            let res1 = {
                                message: err.message,
                                statusCode: err.statusCode
                            };
                            console.info("forgotusername response\n" + JSON.stringify(res1, null, 2));
                            callback(null, res1);
                        }
                        else {

                            let sns = new AWS.SNS();
                            sns.publish({
                                Message: answer + ' is your OTP',
                                PhoneNumber: '+' + ccode + phone_number,
                                MessageAttributes: {
                                    'AWS.SNS.SMS.SenderID': {
                                        'DataType': 'String',
                                        'StringValue': 'SHELLCLUB'
                                    },
                                    'AWS.SNS.SMS.SMSType': {
                                        'DataType': 'String',
                                        'StringValue': 'Transactional'
                                    }
                                }
                            }, (err, data) => {
                                if (err) {
                                    let res2 = {
                                        message: err.message,
                                        statusCode: err.statusCode
                                    };
                                    console.info("forgotusername response\n" + JSON.stringify(res2, null, 2));
                                    callback(null, res2);
                                }

                                let smsres = {
                                    message: "SMS sent",
                                    statusCode: 200
                                };
                                console.info("forgotusername response\n" + JSON.stringify(smsres, null, 2));
                                callback(null, smsres);
                                return;
                            });

                        }
                    });
                }
                else {
                    let dres = {
                        message: "Date of birth not matched",
                        statusCode: 411
                    };
                    console.info("forgotusername response\n" + JSON.stringify(dres, null, 2));
                    callback(null, dres);
                    return;
                }
                console.log(data);
            }
            else {

                let fpsres = {
                    status:data.Users[0].UserStatus,
                    message: "User status is not confirmed",
                    statusCode: 412
                };
                console.info("forgotusername response\n" + JSON.stringify(fpsres, null, 2));
                callback(null, fpsres);
                return;

            }
            }
            else
            {
                  let checkmobilenumber;
                  let username2wls;
                  let password2wls;
                  let getBymobilenumber;
                  
                   if(currentStage == 'dev')
                    {
                        checkmobilenumber = process.env.Devcheckmobilenumber;
                        username2wls = process.env.Devusername;
                        password2wls = process.env.Devpassword;
                        getBymobilenumber = process.env.DevgetBymobilenumber;
                    }
                    else if(currentStage == 'uat')
                    {
                        checkmobilenumber = process.env.UATcheckmobilenumber;
                        username2wls = process.env.UATusername;
                        password2wls = process.env.UATpassword;
                        getBymobilenumber = process.env.UATgetBymobilenumber;
                    }
                    else if(currentStage == 'prod')
                    {
                        checkmobilenumber = process.env.Prodcheckmobilenumber;
                        username2wls = process.env.Produsername;
                        password2wls = process.env.Prodpassword;
                        getBymobilenumber = process.env.ProdgetBymobilenumber;
                    }
                var reqcheckuser = {
                                "mobileNumber": ccode + phone_number
                                }
                
                      req.post({
                            url: checkmobilenumber,
                            auth: {
                                username: username2wls,
                                password: password2wls
                            },
                            body: JSON.stringify(reqcheckuser)
                        }, (error, response, body) => {
                            if(error) {
                                    let res1 = {
                                    message: error.message,
                                    statusCode: error.statusCode
                                };
                                console.info("forgotusername response\n" + JSON.stringify(res1, null, 2));
                                callback(null, res1);
                                return;
                                
                            }
                            else
                            {
                                let checkuser = JSON.parse(body);
                                if(checkuser && checkuser.data && checkuser.data.status && checkuser.data.status == 'Exist')
                                {
                                    req.post({
                                        url: getBymobilenumber,
                                        auth: {
                                            username: username2wls,
                                            password: password2wls
                                        },
                                        body: JSON.stringify(reqcheckuser)
                                    }, (error, response, body) => {
                                        if(error) {
                                                let res1 = {
                                                message: error.message,
                                                statusCode: error.statusCode
                                            };
                                            console.info("forgotusername response\n" + JSON.stringify(res1, null, 2));
                                            callback(null, res1);
                                            return;
                                            
                                        }
                                        else
                                        {
                                            console.log("forgotusername response"+JSON.parse(body));
                                        }
                                    });
                                    
                                }
                                else if(checkuser && checkuser.data && checkuser.data.status && checkuser.data.status == 'Loyalty')
                                {
                                     req.post({
                                        url: getBymobilenumber,
                                        auth: {
                                            username: username2wls,
                                            password: password2wls
                                        },
                                        body: JSON.stringify(reqcheckuser)
                                    }, (error, response, body) => {
                                        if(error) {
                                                let res1 = {
                                                message: error.message,
                                                statusCode: error.statusCode
                                            };
                                            console.info("forgotusername response\n" + JSON.stringify(res1, null, 2));
                                            callback(null, res1);
                                            return;
                                            
                                        }
                                        else
                                        {
                                            console.log('loyalty record');
                                            let userdata = JSON.parse(body);
                                            if(userdata && userdata.data && userdata.data.member)
                                            {
                                                if(userdata.data.member.birthday && userdata.data.member.birthday == dob)
                                                {
                                                let answer = Math.random().toString(10).substr(2, 4);
                                                console.log(userdata.data.member);
                                                var params = {
                                                    UserPoolId: UserPoolId, 
                                                    Username: ccode+phone_number+Date.now(), 
                                                    
                                                    MessageAction: 'SUPPRESS',
                                                    TemporaryPassword: phone_number,
                                                    UserAttributes: [
                                                        {
                                                            Name: 'family_name', 
                                                            Value: ""
                                                        },
                                                        {
                                                            Name: 'gender', 
                                                            Value: userdata.data.member.gender?userdata.data.member.gender:"",
                                                        },
                                                        {
                                                            Name: 'name', 
                                                            Value: userdata.data.member.firstname?userdata.data.member.firstname:"",
                                                        },
                                                        {
                                                            Name: 'given_name', 
                                                            Value: userdata.data.member.lastname?userdata.data.member.lastname:"",
                                                        },
                                                        {
                                                            Name: 'phone_number', 
                                                            Value: "+"+ccode+phone_number
                                                        },
                                                        {
                                                            Name: 'preferred_username', 
                                                            Value: userdata.data.member.login
                                                        },
                                                        {
                                                            Name: 'birthdate', 
                                                            Value: userdata.data.member.birthday?userdata.data.member.birthday:"",
                                                        },
                                                        {
                                                            Name: 'email', 
                                                            Value: userdata.data.member.email?userdata.data.member.email:"",
                                                        },
                                                        {
                                                            Name: 'custom:membertype', 
                                                            Value: userdata.data.member.memberType?userdata.data.member.memberType:"",
                                                        },
                                                        {
                                                            Name: 'custom:city', 
                                                            Value: userdata.data.member.city?userdata.data.member.city:"",
                                                        },
                                                        {
                                                            Name: 'custom:status', 
                                                            Value: 'Forgot-Username'
                                                        },
                                                        {
                                                            Name: 'custom:OTP', 
                                                            Value: answer
                                                        },
                                                        {
                                                            Name: 'custom:OTPupdatedTime', 
                                                            Value: Date.now().toString()
                                                        }
                                                        
                                                    ]
                                                };
                                                cognitoidentityserviceprovider.adminCreateUser(params, function(err, data) {
                                                    if (err) 
                                                    {
                                                     let res = {
                                                            message: err.message,
                                                            statusCode: err.statusCode
                                                     };
                                                     console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
                                                     callback(null, res);
                                                     return;
                                                    }
                                                    else
                                                    {   
                                                        let sns = new AWS.SNS();
                                                         sns.publish({
                                                            Message: answer + ' is your OTP',
                                                            PhoneNumber: '+' + ccode + phone_number,
                                                            MessageAttributes: {
                                                                'AWS.SNS.SMS.SenderID': {
                                                                    'DataType': 'String',
                                                                    'StringValue': 'SHELLCLUB'
                                                                },
                                                                'AWS.SNS.SMS.SMSType': {
                                                                    'DataType': 'String',
                                                                    'StringValue': 'Transactional'
                                                                }
                                                            }
                                                        }, (err, data) => {
                                                            if (err) {
                                                                let res2 = {
                                                                    message: err.message,
                                                                    statusCode: err.statusCode
                                                                };
                                                                console.info("forgotusername response\n" + JSON.stringify(res2, null, 2));
                                                                callback(null, res2);
                                                                return;
                                                            }
                                                            else
                                                            {
                                                                                                
                                                                let smsres = {
                                                                    message: "SMS sent",
                                                                    statusCode: 200
                                                                };
                                                                console.info("forgotusername response\n" + JSON.stringify(smsres, null, 2));
                                                                callback(null, smsres);
                                                                return;
                                                            }
                                                        });
                                                    }
                                                });
                                                }
                                                else
                                                {
                                                    let dres = {
                                                        message: "Date of birth not matched",
                                                        statusCode: 411
                                                    };
                                                    console.info("forgotusername response\n" + JSON.stringify(dres, null, 2));
                                                    callback(null, dres);
                                                    return;
                                                }
                                            }
                                            else
                                            {
                                                let fpsres = {
                                                message: "2wls internal error",
                                                statusCode: 400
                                                };
                                                console.info("forgotusername response\n" + JSON.stringify(fpsres, null, 2));
                                                callback(null, fpsres);
                                                return;
                                            }
                                            
                                        }
                                    });
                                }
                                else if(checkuser && checkuser.data && checkuser.data.status && checkuser.data.status == 'Loyaltypartial')
                                {
                                    let fpsres = {
                                    message: "User status is not confirmed",
                                    status:"Loyalty-partial",
                                    statusCode: 412
                                    };
                                    console.info("forgotusername response\n" + JSON.stringify(fpsres, null, 2));
                                    callback(null, fpsres);
                                    return;
                                }
                                 else if(checkuser && checkuser.data && checkuser.data.status && checkuser.data.status == 'LoyaltyPartialusername')
                                {
                                    let fpsres = {
                                    message: "User status is not confirmed",
                                    status:"Loyalty-partial-username",
                                    statusCode: 412
                                    };
                                    console.info("forgotusername response\n" + JSON.stringify(fpsres, null, 2));
                                    callback(null, fpsres);
                                    return;
                                }
                                else
                                {
                                     let res = {
                                        message: "UserNotFound",
                                        statusCode: 415
                                    };
                                        console.info("forgotusername response\n" + JSON.stringify(res, null, 2));
                                        callback(null, res);
                                        return;
                                }
                            }
                        });
             
            }
        }
    });
};

function search(nameKey, myArray) {
    for (var i = 0; i < myArray.length; i++) {
        if (myArray[i].Name === nameKey) {
            return myArray[i];
        }
    }
}
