import { useAuth } from '../../context/AuthContext';
import { HiStar, HiAcademicCap, HiTrophy, HiShieldCheck } from 'react-icons/hi2';
import './Rewards.css';

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Aarav Mehta', points: 480, badges: 5 },
  { rank: 2, name: 'Priya Sharma', points: 390, badges: 4 },
  { rank: 3, name: 'Amit Patel', points: 310, badges: 3 },
  { rank: 4, name: 'Sanjay Sen', points: 250, badges: 3 },
];

const Rewards = () => {
  const { user } = useAuth();

  // Combine mock data with active user points for demo
  const userRank = user?.rewardPoints > 250 ? 3 : 5;
  const currentLeaderboard = [
    ...MOCK_LEADERBOARD,
    { rank: userRank, name: user?.name || 'You', points: user?.rewardPoints || 0, badges: 2, isSelf: true }
  ].sort((a, b) => b.points - a.points);

  return (
    <div className="rewards animate-fade-in">
      <div className="rewards__header">
        <h1>Citizen Rewards & Badges</h1>
        <p className="rewards__subtitle">Earn points for cleanups, verification, and civic engagement</p>
      </div>

      <div className="rewards__grid">
        {/* Left Column — User Points Card & Trophy Shelf */}
        <div className="rewards__left">
          {/* User Score Card */}
          <div className="score-card glass-card">
            <div className="score-card__circle">
              <HiStar className="score-card__icon" />
              <h2>{user?.rewardPoints || 0}</h2>
              <span>Points Earned</span>
            </div>
            <div className="score-card__info">
              <h3>Community Shield Tier</h3>
              <p>You need 180 more points to unlock the <b>Golden Guardian Badge</b>!</p>
              <div className="progress-bar-wrapper">
                <div className="progress-bar" style={{ width: `${Math.min(((user?.rewardPoints || 0) / 300) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Badges Shelf */}
          <div className="badges-card glass-card">
            <h2>My Trophy Shelf</h2>
            <div className="badges-grid">
              <BadgeItem icon={<HiTrophy style={{ color: '#f59e0b' }} />} name="First Report" desc="Earned by submitting your first complaint" unlocked />
              <BadgeItem icon={<HiShieldCheck style={{ color: '#3b82f6' }} />} name="Guardian" desc="Reported 5 valid civic issues" unlocked />
              <BadgeItem icon={<HiAcademicCap style={{ color: '#6b7280' }} />} name="Spotless Citizen" desc="Reported 20 complaints" />
              <BadgeItem icon={<HiStar style={{ color: '#6b7280' }} />} name="Elite Verifier" desc="Close 10 complaints with positive feedback" />
            </div>
          </div>
        </div>

        {/* Right Column — Gamification Leaderboard */}
        <div className="rewards__right">
          <div className="leaderboard-card glass-card">
            <h2>Nagaram Leaderboard</h2>
            <p className="leaderboard-desc">Top reporting citizens this month</p>
            <div className="leaderboard-list">
              {currentLeaderboard.map((item, idx) => (
                <div key={idx} className={`leaderboard-item ${item.isSelf ? 'leaderboard-item--self' : ''}`}>
                  <span className="leaderboard-rank">#{item.rank}</span>
                  <div className="leaderboard-avatar">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="leaderboard-info">
                    <span className="leaderboard-name">{item.name}</span>
                    <span className="leaderboard-sub">{item.badges} badges</span>
                  </div>
                  <span className="leaderboard-points">{item.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BadgeItem = ({ icon, name, desc, unlocked }) => (
  <div className={`badge-item ${unlocked ? 'badge-item--unlocked' : 'badge-item--locked'}`}>
    <div className="badge-item__icon">
      {icon}
    </div>
    <h4>{name}</h4>
    <p>{desc}</p>
  </div>
);

export default Rewards;
