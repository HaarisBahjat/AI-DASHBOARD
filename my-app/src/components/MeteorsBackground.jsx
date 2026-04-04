import React, { useMemo } from 'react';

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function MeteorsBackground({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
}) {
  const meteors = useMemo(
    () =>
      Array.from({ length: number }, (_, index) => ({
        id: index,
        left: `${randomInRange(-10, 110)}%`,
        top: `${randomInRange(-35, 15)}%`,
        delay: `${randomInRange(minDelay, maxDelay).toFixed(2)}s`,
        duration: `${randomInRange(minDuration, maxDuration).toFixed(2)}s`,
        size: `${randomInRange(60, 150).toFixed(0)}px`,
      })),
    [angle, maxDelay, maxDuration, minDelay, minDuration, number]
  );

  return (
    <div className="mk-meteors" aria-hidden="true">
      {meteors.map((meteor) => (
        <span
          key={meteor.id}
          className="mk-meteor"
          style={{
            left: meteor.left,
            top: meteor.top,
            '--meteor-delay': meteor.delay,
            '--meteor-duration': meteor.duration,
            '--meteor-size': meteor.size,
            '--meteor-angle': `${angle}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default MeteorsBackground;
