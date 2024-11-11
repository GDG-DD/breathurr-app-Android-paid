import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { IoIosPlay, IoIosRefresh } from 'react-icons/io';
import { BsFillVolumeUpFill, BsFillVolumeMuteFill } from 'react-icons/bs';

import { Container } from '../container';

import { padNumber } from '@/helpers/number';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSound } from '@/hooks/use-sound';

import styles from './app.module.css';

type Exercise =
  | 'Samavritti Advanced'
  | 'Samavritti Basic'
  | '4-7-8 Breathing'
  | 'Pursed Lip Breathing'
  | 'Diaphragmatic Breathing'
  | 'Nadī Shodhana'
  | 'Custom';

type Phase = 'inhale' | 'exhale' | 'holdInhale' | 'holdExhale';

const EXERCISE_PHASES: Record<Exercise, Phase[]> = {
  '4-7-8 Breathing': ['inhale', 'holdInhale', 'exhale'],
  Custom: ['inhale', 'holdInhale', 'exhale', 'holdExhale'],
  'Diaphragmatic Breathing': ['inhale', 'exhale'],
  'Nadī Shodhana': ['inhale', 'exhale'],
  'Pursed Lip Breathing': ['inhale', 'exhale'],
  'Samavritti Advanced': ['inhale', 'holdInhale', 'exhale', 'holdExhale'],
  'Samavritti Basic': ['inhale', 'exhale'],
};

const EXERCISE_DURATIONS: Record<Exercise, Partial<Record<Phase, number>>> = {
  '4-7-8 Breathing': { exhale: 8, holdInhale: 7, inhale: 4 },
  Custom: {},
  'Diaphragmatic Breathing': { exhale: 6, inhale: 4 },
  'Nadī Shodhana': { exhale: 3, inhale: 3 },
  'Pursed Lip Breathing': { exhale: 4, inhale: 2 },
  'Samavritti Advanced': { exhale: 6, holdExhale: 6, holdInhale: 6, inhale: 6 },
  'Samavritti Basic': { exhale: 4, inhale: 4 },
};

const PHASE_LABELS: Record<Phase, string> = {
  exhale: 'Exhale',
  holdExhale: 'Hold',
  holdInhale: 'Hold',
  inhale: 'Inhale',
};

const DESC: Record<Exercise, string> = {
  '4-7-8 Breathing': `<br><br>Inhale for 4 seconds, hold the breath for 7 seconds, and exhale for 8 seconds.<br>
    <hr style="border: none; border-top: 1px dotted var(--border-color); margin: 10px 0 20px;">
    The 4-7-8 breathing technique is a form of pranayama, which is the practice of breath regulation in yoga. It requires a person to focus on taking long, deep breaths in and out.<br><br>
    This breathing pattern aims to reduce anxiety and soothes nerves prior to sleep.`,

  Custom: ' Create your own custom breathing exercise.',

  'Diaphragmatic Breathing': `<br><br>Inhale deeply, expanding the diaphragm, for 4 seconds, and exhale for 6 seconds.<br>
    <hr style="border: none; border-top: 1px dotted var(--border-color); margin: 10px 0 20px;">
    Practicing relaxed, diaphragmatic breathing is refreshing and restful, and creates a sense of well-being.<br><br>
    It calms the nervous system and centers attention in the ADHD mind.`,

  'Nadī Shodhana': `<br><br>Inhale through the left nostril for 3 seconds, exhale through the right nostril for 3 seconds, and repeat.<br>
    <hr style="border: none; border-top: 1px dotted var(--border-color); margin: 10px 0 20px;">
    Sometimes called channel-clearing breath, alternate nostril breathing, known in Sanskrit as Nadī Shodhana, has historically been said to clear energy blockages and bring about inner balance.
    <br><br>Isolate each nostril, breathing in through only one of them at a time and then exhaling through the other.`,

  'Pursed Lip Breathing': `<br><br>Inhale through the nose for 2 seconds with mouth closed, exhale slowly through pursed lips(like kissing, let your cheeks inflate as you exhale for 4 seconds.<br>
    <hr style="border: none; border-top: 1px dotted var(--border-color); margin: 10px 0 20px;">
    Pursed Lip Breathing is a slow breathing technique that enables a person to be aware and control how much air enters and leaves their lungs<br><br>
    It is beneficial for reducing anxiety and increasing relaxation.`,

  'Samavritti Advanced': `<br><br>Inhale for 6 seconds, hold for 6 seconds, exhale for 6 seconds, and hold again for 6 seconds.<br>
    <hr style="border: none; border-top: 1px dotted var(--border-color); margin: 10px 0 20px;">
    Samavritti, or equal breath, is a pranayama practice that balances inhalation, internal retention, exhalation, and external retention. 
    It enhances breath awareness, calms the body, and sharpens focus for meditation.<br><br>
    Try to cultivate the same quality of breath at the beginning, middle, and end of the count. 
    The breath should not be forced or strained.`,

  'Samavritti Basic': `<br><br>Breathe in and out evenly, usually around 4 seconds per breathe.<br>
    <hr style="border: none; border-top: 1px dotted var(--border-color); margin: 10px 0 20px;">
    Samavritti, or equal breath, is a pranayama practice that balances inhalation, internal retention, exhalation, and external retention. 
    It enhances breath awareness, calms the body, and sharpens focus for meditation.
    <br><br>In this basic version of Samavritti, there is no need to hold the breath.`,
};

export function App() {
  const [selectedExercise, setSelectedExercise] =
    useState<Exercise>('4-7-8 Breathing');

  const [customDurations, setCustomDurations] = useLocalStorage<
    Partial<Record<Phase, number>>
  >('calmness-custom-durations', {
    exhale: 4,
    holdExhale: 4,
    holdInhale: 4,
    inhale: 4,
  });

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [timer, setTimer] = useState(0);

  const playSound = useSound('/chime.mp3');
  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const durations = useMemo(() => {
    if (selectedExercise === 'Custom') {
      return customDurations;
    }
    return EXERCISE_DURATIONS[selectedExercise];
  }, [selectedExercise, customDurations]);

  const phases = useMemo(
    () =>
      EXERCISE_PHASES[selectedExercise].filter(
        phase => (durations[phase] || 0) > 0,
      ),
    [selectedExercise, customDurations],
  );

  const currentPhase = phases[phaseIndex];

  const animationVariants = useMemo(
    () => ({
      exhale: {
        transform: 'translate(-50%, -50%) scale(1)',
        transition: { duration: durations.exhale },
      },
      holdExhale: {
        transform: 'translate(-50%, -50%) scale(1)',
        transition: { duration: durations.holdExhale },
      },
      holdInhale: {
        transform: 'translate(-50%, -50%) scale(1.5)',
        transition: { duration: durations.holdInhale },
      },
      inhale: {
        transform: 'translate(-50%, -50%) scale(1.5)',
        transition: { duration: durations.inhale },
      },
    }),
    [durations],
  );

  const resetExercise = useCallback(() => {
    setPhaseIndex(0);
    setRunning(false);
  }, []);

  const updatePhase = useCallback(() => {
    if (running) {
      if (!mutedRef.current) playSound();

      setPhaseIndex(prevIndex => (prevIndex + 1) % phases.length);
    }
  }, [phases.length, running, playSound]);

  useEffect(() => {
    resetExercise();
  }, [selectedExercise, resetExercise]);

  useEffect(() => {
    if (running) {
      const intervalDuration = (durations[currentPhase] || 4) * 1000;
      const interval = setInterval(updatePhase, intervalDuration);

      return () => clearInterval(interval);
    }
  }, [running, currentPhase, durations, updatePhase]);

  useEffect(() => {
    if (running) {
      const interval = setInterval(() => setTimer(prev => prev + 1), 1000);

      return () => clearInterval(interval);
    }
  }, [running]);

  return (
    <Container>
      <div className={styles.exercise}>
        <div className={styles.timer}>
          {padNumber(Math.floor(timer / 60))}:{padNumber(timer % 60)}
        </div>

        {running && (
          <div className={styles.progressbar}>
            <motion.div
              className={styles.progress}
              initial={{ width: '0%' }}
              key={`phase-${currentPhase}`}
              animate={{
                transition: {
                  duration: (durations[currentPhase] || 0) - 1,
                  ease: 'linear',
                },
                width: '100%',
              }}
            />
          </div>
        )}

        <button
          className={styles.audio}
          onClick={() => setMuted(prev => !prev)}
        >
          {muted ? <BsFillVolumeMuteFill /> : <BsFillVolumeUpFill />}
        </button>

        {running && (
          <motion.div
            animate={currentPhase}
            className={styles.circle}
            key={selectedExercise}
            variants={animationVariants}
          />
        )}

        <p className={styles.phase}>
          {running ? PHASE_LABELS[currentPhase] : 'Paused'}
        </p>

        <div className={styles.selectWrapper}>
          <select
            className={styles.selectBox}
            disabled={running}
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value as Exercise)}
          >
            {Object.keys(EXERCISE_PHASES)
              .filter(phase => phase !== 'Custom')
              .map(exercise => (
                <option key={exercise} value={exercise}>
                  {exercise}
                </option>
              ))}
            <option value="Custom">Custom</option>
          </select>

          <button
            className={styles.controlButton}
            onClick={() => {
              if (running) {
                resetExercise();
              } else {
                setRunning(true);
              }
            }}
          >
            {running ? <IoIosRefresh /> : <IoIosPlay />}
          </button>
        </div>
      </div>

      {selectedExercise === 'Custom' && (
        <div className={styles.customForm}>
          {['inhale', 'holdInhale', 'exhale', 'holdExhale'].map(phase => (
            <div className={styles.field} key={phase}>
              <label htmlFor={phase}>
                {PHASE_LABELS[phase as Phase]} Duration:
              </label>
              <input
                disabled={running}
                id={phase}
                min="0"
                type="number"
                value={customDurations[phase as Phase]}
                onChange={e =>
                  setCustomDurations(prev => ({
                    ...prev,
                    [phase]: Number(e.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {selectedExercise !== 'Custom' && (
        <div className={styles.desc}>
          <span>
            <strong>{selectedExercise}:</strong>
          </span>
          <span dangerouslySetInnerHTML={{ __html: DESC[selectedExercise] }} />
        </div>
      )}
    </Container>
  );
}
