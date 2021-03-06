const passport = require("passport");
const db = require("../../db/connection");

/**
 * GOOGLE STRATEGY
 *
 * Used for both authenticating and linking of accounts
 */

const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
  new GoogleStrategy( // Default name google
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      // If user is logged in, proceed to simply link account
      if (req.user) {
        try {
          await db.query(
            "UPDATE users SET google_id = $1, google_email = $2 WHERE user_id = $3;",
            [profile.id, profile.emails[0].value, req.user.user_id]
          );
          // No error (google account not already in use) link and return updated user
          console.log("HERE1");
          return done(null, req.user);
        } catch (err) {
          console.log("HERE  2");
          // If google account is duplicate (linked to different account) will return error
          return done(null, req.user, {
            msg: "Sorry, the Google account you tried to link is already associated with another account.",
          });
        }
      }

      // If not logged in
      else {
        try {
          // Check if google account is registered
          let res = await db.query(
            "SELECT * FROM users WHERE google_id = $1;",
            [profile.id]
          );
          let rows = res.rows;

          // If user already registered, log in
          if (rows.length) {
            return done(null, rows[0]);
          }

          // Check if email in use before inserting, if so link and login
          res = await db.query("SELECT * FROM users WHERE email = $1;", [
            profile.emails[0].value,
          ]);
          rows = res.rows;
          const userIdToLinkTo = rows[0]?.user_id;

          if (rows.length) {
            const { rows } = await db.query(
              "UPDATE users SET google_id = $1, google_email = $2, google_display_name = $3 WHERE user_id = $4 RETURNING *;",
              [
                profile.id,
                profile.emails[0].value,
                profile.displayName,
                userIdToLinkTo,
              ]
            );
            return done(null, rows[0]);
          }
          // If no existing record, register the user.
          else {
            const name =
              profile.name.givenName && profile.name.familyName
                ? `${profile.name.givenName} ${profile.name.familyName}`
                : "";

            // Specific to this platform, will try display_name as username else create random username
            try {
              const { rows } = await db.query(
                "INSERT INTO users (username, email, google_id, original_method, name, google_email, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;",
                [
                  profile.displayName,
                  profile.emails[0].value,
                  profile.id,
                  "go",
                  name,
                  profile.emails[0].value,
                  profile.coverPhoto,
                ]
              );
              return done(null, rows[0]);
            } catch (err) {
              // if username in use (or invalid) create random one
              if (
                err.code === "23505" &&
                err.constraint === "users_username_key"
              ) {
                const { rows } = await db.query(
                  "INSERT INTO users (username, email, google_id, original_method, name, google_email, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;",
                  [
                    `user${Math.random().toString().substr(2, 8)}`,
                    profile.emails[0].value,
                    profile.id,
                    "go",
                    name,
                    profile.emails[0].value,
                    profile.coverPhoto,
                  ]
                );
                return done(null, rows[0]);
              }
            }
          }
        } catch (err) {
          return done(err);
        }
      }
    }
  )
);
