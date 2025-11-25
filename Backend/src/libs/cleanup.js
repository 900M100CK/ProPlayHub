import cron from 'node-cron';
import User from '../models/User.js';

const cleanupExpiredOtps = async () => {
  console.log('Running cron job: Cleaning up expired OTPs...');
  try {
    const now = new Date();
    const result = await User.updateMany(
      {
        $or: [
          { passwordResetOTPExpires: { $lt: now } },
          { verificationTokenExpires: { $lt: now } },
        ],
      },
      {
        $unset: {
          passwordResetOTP: '',
          passwordResetOTPExpires: '',
          verificationToken: '',
          verificationTokenExpires: '',
        },
      }
    );

    console.log(`Expired OTP cleanup finished. ${result.modifiedCount} user(s) updated.`);
  } catch (error) {
    console.error('Error during expired OTP cleanup cron job:', error);
  }
};

export const startExpiredOtpCleanupJob = () => cron.schedule('0 0 * * *', cleanupExpiredOtps);