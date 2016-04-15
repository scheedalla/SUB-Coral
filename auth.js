
/**
 * Module dependencies
 */

import passport from 'passport';
import passwordHash 'password-hash';
import { Strategy as LocalStrategy } from 'passport-local';
import { BasicStrategy } from'passport-http';
import { Strategy as LdapStrategy } from 'passport-ldapauth';
import ldapOpts from 'config/ldap';
import { sendSESEmail } from 'sub-utils';



// Serialization middleware
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id, done));

/**
 * Auth strategies
 */

const localStrategy = async (req, username, password, done) => {
  const userType = username.indexOf('@') > -1 ? 'emailAddress' : 'userName';
  const query = { [userType]: username.toLowerCase() };

  try {
    const user = await User.findOne(query).exec();
    if (!user) {
      console.log("Action=login login-type=local UserName=" + username + " Status=failure Message='No user found'");
      return done(null, false, { message: 'Invalid username or password. Please try again.' });
    }
    if (!passwordHash.verify(password, user.password)) {
      console.log("Action=login login-type=local UserName=" + username + " Status=failure Message='Incorrect password'");
      return done(null, false, { message: 'Invalid username or password. Please try again.' });
    }
    if (user.account.status == "inactive") {
      console.log("Action=login login-type=local UserName=" + username + " Status=failure Message='This account is inactive'");
      return done(null, false, { message: 'This account is inactive' });
    }

    user.lastActivity = new Date();
    user.userNotifiedOfInnactivity = false
    console.log("Action=login login-type=local UserName=" + username + " Status=success");
    user.save(err =>done(err, user));
  } catch (err) {
    done(err);
  }
};

const basicStrategy = async (req, userName, password, done) => {
  try {
    const user = await User.findOne({ userName }).exec();
    if (!user) return done(null, false);
    if (!passwordHash.verify(password, user.password)) return done(null, false);
    user.lastActivity = new Date();
    user.userNotifiedOfInnactivity = false;
    user.save();

    user.session = {};
    const doc = await Account.findOne({ _id: user.account.acctId }).exec();
    if (!doc) {
      console.log("Action=login login-type=basic UserName=" + userName + " Status=failure");
      done(null, false);
    } else {
      user.session.account = doc
      const settings = await Settings.findOne({type:"account settings", name: user.session.account.type}).exec();
        if(!settings) {
          console.log("Action=login login-type=basic UserName=" + userName + " Status=failure");
          return done(null, false);
        } else {
          console.log("Action=login login-type=basic UserName=" + userName + " Status=success");
          user.session.accountSettings = settings;
          return done(null, user);
        }
      })
    }
  } catch (err) {
    done(err);
  }
};

const ldapStrategy = async (user, done) => {
  var mapUser = ldapUserMapping(user);

  try {
    //Check to see if the user exists in the local database
    let localUser = await User.findOne({employeeID:user.employeeID}).exec();
    if (!localUser) {
      //This must be a new user who authenticated via LDAP, create a local user account.
      localUser = await User.create(mapUser).exec();
      console.log(`Action=register login-type=twpn UserName="${user.sAMAccountName} Status=success`);

      const sesMessage = {
        Subject: {
          Data: 'Welcome to SUB!'
        },
        Body: {
          Html: {
            Data:  `${messages.emailNewRegistration}
                    ${messages.emailConfirmEmail} <a href='mailto:${user.mail}' target='_blank'>${user.mail}</a>. <br><br>
                    ${messages.emailContactInfo}`
          }
        }
      };

      sendSESEmail(messages.fromEmail, [user.mail], sesMessage);
      return done(null, localUser);
    } else {
      //This is a user who has accessed our system before
      localUser.lastActivity = new Date();
      if(localUser.userNotifiedOfInnactivity) {
        delete localUser.userNotifiedOfInnactivity
      }
      await localUser.save().exec();

      console.log(`Action=login login-type=twpn UserName=${user.sAMAccountName} Status=success`);
      return done(null, localUser);
    }
  } catch (err) {
    done(err, null, err);
  }
};

passport.use(new LocalStrategy({ passReqToCallback: true }, localStrategy));
passport.use(new BasicStrategy({ passReqToCallback: true }, basicStrategy));
passport.use(new LdapStrategy(ldapOpts, ldapStrategy));

/**
 * Auxiliar functions
 */

async function findByEmployeeID (u, fn) {
  try {
    const user = await User.findOne({ employeeID: u }).exec();
    fn(null, user);
  } catch (err) {
    fn(null, null);
  }
}

function ldapUserMapping(user) {
  var subUser = {};
  if(user) {
    subUser = {
      employeeID: user.employeeID,
      customerName: user.givenName + '' + user.sn,
      userName: user.sAMAccountName,
      emailAddress: user.mail,
      creationDate: new Date(),
      isLDAP: true,
      account: {
        acctId: '53c935be7304a04920d58910',
        role:'user',
        status:'active'
      }
    };

    return subUser;
  }
}
