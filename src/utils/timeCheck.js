import { supabase } from '../libs/supabaseClient';

export const checkVotingAvailability = async () => {
  try {
    // Ambil config dari database
    const { data: configs, error } = await supabase
      .from('event_config')
      .select('config_key, config_value');

    if (error) throw error;

    // Convert ke object
    const config = {};
    configs.forEach((item) => {
      config[item.config_key] = item.config_value;
    });

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    // Cek apakah voting diaktifkan
    if (config.allow_voting !== 'true') {
      return {
        allowed: false,
        message: 'Sistem voting sedang dinonaktifkan',
        status: 'disabled',
      };
    }

    // Cek tanggal acara
    if (currentDate !== config.event_date) {
      return {
        allowed: false,
        message: `Voting hanya pada tanggal ${config.event_date}`,
        status: 'wrong_date',
      };
    }

    // Cek jam voting
    if (currentTime < config.voting_start) {
      return {
        allowed: false,
        message: `Voting dibuka pukul ${config.voting_start}`,
        status: 'too_early',
      };
    }

    if (currentTime > config.voting_end) {
      return {
        allowed: false,
        message: `Voting ditutup pukul ${config.voting_end}`,
        status: 'too_late',
      };
    }

    return {
      allowed: true,
      message: 'Voting sedang berlangsung',
      status: 'active',
    };
  } catch (error) {
    console.error('Error checking voting availability:', error);
    return {
      allowed: false,
      message: 'Error sistem, hubungi panitia',
      status: 'error',
    };
  }
};
