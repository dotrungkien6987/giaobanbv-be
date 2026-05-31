require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { COMMON_WEAK_PASSWORDS } = require("../helpers/passwordPolicy");

function getArgumentValue(flagName) {
  const argument = process.argv.find((value) =>
    value.startsWith(`${flagName}=`),
  );
  return argument ? argument.slice(flagName.length + 1) : null;
}

function printUsage() {
  console.log(`
Usage:
  node scripts/flagWeakPasswords.js [--apply] [--user=<UserName>]
  node scripts/flagWeakPasswords.js --clear [--user=<UserName>]

Modes:
  default   Dry-run: chi liet ke tai khoan match denylist mat khau yeu.
  --apply   Dat mustChangePassword=true cho cac tai khoan match.
  --clear   Rollback: clear mustChangePassword cho filter duoc chon.

Examples:
  node scripts/flagWeakPasswords.js
  node scripts/flagWeakPasswords.js --apply --user=kiendt
  node scripts/flagWeakPasswords.js --clear --user=kiendt
`);
}

async function connectDatabase() {
  const mongoURI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaobanbv";
  await mongoose.connect(mongoURI);
}

async function findWeakPasswordMatches(query) {
  const users = await User.find(query).select(
    "+PassWord mustChangePassword UserName PhanQuyen HoTen",
  );
  const matches = [];

  for (const user of users) {
    for (const weakPassword of COMMON_WEAK_PASSWORDS) {
      const isMatch = await bcrypt.compare(weakPassword, user.PassWord);
      if (!isMatch) {
        continue;
      }

      matches.push({
        _id: user._id,
        UserName: user.UserName,
        HoTen: user.HoTen,
        PhanQuyen: user.PhanQuyen,
        mustChangePassword: Boolean(user.mustChangePassword),
        matchedWeakPassword: weakPassword,
      });
      break;
    }
  }

  return matches;
}

async function clearMustChangePassword(query) {
  const result = await User.updateMany(query, {
    $set: { mustChangePassword: false },
  });

  console.log(
    `Rollback completed. matched=${result.matchedCount || 0}, modified=${result.modifiedCount || 0}`,
  );
}

async function main() {
  const showHelp = process.argv.includes("--help");
  const shouldApply = process.argv.includes("--apply");
  const shouldClear = process.argv.includes("--clear");
  const userNameFilter = getArgumentValue("--user");

  if (showHelp) {
    printUsage();
    return;
  }

  if (shouldApply && shouldClear) {
    throw new Error("Khong the dung dong thoi --apply va --clear");
  }

  const query = { isDeleted: false };
  if (userNameFilter) {
    query.UserName = userNameFilter;
  }

  await connectDatabase();

  if (shouldClear) {
    await clearMustChangePassword(query);
    return;
  }

  const matches = await findWeakPasswordMatches(query);

  if (!matches.length) {
    console.log("Khong tim thay tai khoan nao match denylist mat khau yeu.");
    return;
  }

  console.table(matches);

  if (!shouldApply) {
    console.log(
      "Dry-run completed. Them --apply neu muon gan mustChangePassword=true cho cac tai khoan tren.",
    );
    return;
  }

  const userIds = matches.map((match) => match._id);
  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { mustChangePassword: true } },
  );

  console.log(
    `Apply completed. matched=${result.matchedCount || 0}, modified=${result.modifiedCount || 0}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
