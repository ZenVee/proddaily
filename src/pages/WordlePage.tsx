import { useState, useEffect, useCallback, useRef } from 'react';
import { PublicPage } from '@/components/layout/PublicPage';
import { WordleGrid } from '@/components/game/wordle/WordleGrid';
import { Keyboard } from '@/components/game/wordle/Keyboard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { wordleService, type ActiveWordlePayload } from '@/services/wordleService';
import { useToast } from '@/state/ToastContext';
import { useAuth } from '@/state/AuthContext';
import { useRouter } from '@/state/RouterContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getKeyboardStatus,
  buildShareText,
  buildShareTextFromFeedback,
  WORDLE_MAX_GUESSES,
  WORDLE_WORD_LENGTH,
  evaluateGuess,
  normalizeFeedbackRows,
} from '@/utils/wordleLogic';
import { todayStr, msUntilMidnight, formatCountdown, formatDisplayDate } from '@/utils/helpers';
import type { LetterFeedback } from '@/types';
import { Clock, Copy, Check, Trophy, Skull } from 'lucide-react';

export function WordlePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { navigate } = useRouter();
  const today = todayStr();
  const remote = isSupabaseConfigured;

  const [remotePuzzle, setRemotePuzzle] = useState<ActiveWordlePayload | null>(null);
  const [loading, setLoading] = useState(remote);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [feedbackRows, setFeedbackRows] = useState<LetterFeedback[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'not-started' | 'in-progress' | 'won' | 'lost' | 'completed'>('in-progress');
  const [answer, setAnswer] = useState<string | null>(null);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showShareCopied, setShowShareCopied] = useState(false);
  const [countdown, setCountdown] = useState(msUntilMidnight());
  const [shakeRow, setShakeRow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const localPuzzle = !remote ? wordleService.getActivePuzzle() : null;

  useEffect(() => {
    const interval = setInterval(() => setCountdown(msUntilMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!remote) {
      const progress = wordleService.getProgress(today);
      const localGuesses = progress?.guesses ?? [];
      setGuesses(localGuesses);
      if (localPuzzle?.word && localGuesses.length > 0) {
        setFeedbackRows(localGuesses.map((g) => evaluateGuess(g, localPuzzle.word)));
      }
      if (progress?.status === 'won' || progress?.status === 'lost') {
        setGameStatus('completed');
        setAnswer(localPuzzle?.word ?? null);
      }
      return;
    }

    setLoading(true);
    wordleService
      .getActivePuzzleRemote()
      .then((p) => {
        setRemotePuzzle(p);
        if (p?.attempt) {
          const loadedGuesses = p.attempt.guesses ?? [];
          setGuesses(loadedGuesses);
          setFeedbackRows(normalizeFeedbackRows(p.attempt.feedback, loadedGuesses, p.answer));
          if (p.attempt.status !== 'in_progress') {
            setGameStatus(p.attempt.status === 'won' ? 'won' : 'lost');
            setAnswer(p.answer);
          }
        }
        if (p?.answer) setAnswer(p.answer);
      })
      .catch((err: unknown) => toast(err instanceof Error ? err.message : 'Failed to load puzzle', 'error'))
      .finally(() => setLoading(false));
  }, [remote, today, toast, localPuzzle?.word]);

  const hasPuzzle = remote ? !!remotePuzzle : !!localPuzzle;
  const isFinished = gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'completed';
  const showResultModal = showResult && isFinished;
  const revealedCount = revealingRow === null ? guesses.length : revealingRow;
  const letterStatus = getKeyboardStatus(
    guesses.slice(0, revealedCount),
    feedbackRows.length ? feedbackRows.slice(0, revealedCount) : answer ?? '',
  );

  const submitGuess = useCallback(async () => {
    if (isFinished || submitting) return;
    if (currentGuess.length !== WORDLE_WORD_LENGTH) {
      setShakeRow(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setShakeRow(false), 400);
      toast('Not enough letters', 'warning');
      return;
    }
    if (!(await wordleService.isAllowedWord(currentGuess))) {
      setShakeRow(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setShakeRow(false), 400);
      toast('Not in word list', 'warning');
      return;
    }

    if (remote) {
      if (!user) {
        toast('Sign in to play the daily Wordle', 'info');
        navigate({ page: 'login' });
        return;
      }
      setSubmitting(true);
      try {
        const result = await wordleService.submitGuess(currentGuess);
        const newGuesses = result.guesses;
        setGuesses(newGuesses);
        const fromServer = normalizeFeedbackRows(result.all_feedback, newGuesses, result.answer);
        setFeedbackRows(
          fromServer.length === newGuesses.length
            ? fromServer
            : [...normalizeFeedbackRows(feedbackRows, guesses, answer), result.feedback],
        );
        setCurrentGuess('');
        setRevealingRow(newGuesses.length - 1);
        setTimeout(() => {
          setRevealingRow(null);
          if (result.status === 'won') {
            setGameStatus('won');
            setAnswer(result.answer);
            setShowResult(true);
            toast('Solved! Well done.', 'success');
          } else if (result.status === 'lost') {
            setGameStatus('lost');
            setAnswer(result.answer);
            setShowResult(true);
            toast('Out of guesses', 'info');
          }
        }, (WORDLE_WORD_LENGTH - 1) * 150 + 500);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Guess failed';
        if (/not in word list/i.test(message)) {
          setShakeRow(true);
          if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
          shakeTimerRef.current = setTimeout(() => setShakeRow(false), 400);
          toast('Not in word list', 'warning');
        } else {
          toast(message, 'error');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const localAnswer = localPuzzle?.word ?? 'CRANE';
    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    setFeedbackRows(newGuesses.map((g) => evaluateGuess(g, localAnswer)));
    setCurrentGuess('');
    setRevealingRow(newGuesses.length - 1);
    setTimeout(() => {
      setRevealingRow(null);
      if (currentGuess === localAnswer) {
        setGameStatus('won');
        setAnswer(localAnswer);
        setShowResult(true);
        wordleService.saveProgress({ date: today, guesses: newGuesses, status: 'won', solvedAt: new Date().toISOString() });
        toast('Solved! Well done.', 'success');
      } else if (newGuesses.length >= WORDLE_MAX_GUESSES) {
        setGameStatus('lost');
        setAnswer(localAnswer);
        setShowResult(true);
        wordleService.saveProgress({ date: today, guesses: newGuesses, status: 'lost' });
        toast('The word was ' + localAnswer, 'info');
      }
    }, (WORDLE_WORD_LENGTH - 1) * 150 + 500);
  }, [isFinished, submitting, currentGuess, remote, user, navigate, toast, guesses, feedbackRows, answer, localPuzzle?.word, today]);

  const handleKey = useCallback((key: string) => {
    if (isFinished || revealingRow !== null || submitting) return;
    setCurrentGuess((prev) => (prev.length >= WORDLE_WORD_LENGTH ? prev : prev + key.toUpperCase()));
  }, [isFinished, revealingRow, submitting]);

  const handleBackspace = useCallback(() => {
    if (isFinished || revealingRow !== null || submitting) return;
    setCurrentGuess((prev) => prev.slice(0, -1));
  }, [isFinished, revealingRow, submitting]);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (showResultModal) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void submitGuess();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKey(e.key.toUpperCase());
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [submitGuess, handleKey, handleBackspace, showResultModal]);

  function handleCopy() {
    const text = feedbackRows.length
      ? buildShareTextFromFeedback(guesses, feedbackRows, gameStatus === 'won' || gameStatus === 'completed', today)
      : buildShareText(guesses, answer ?? '', gameStatus === 'won' || gameStatus === 'completed', today);
    navigator.clipboard.writeText(text).then(() => {
      setShowShareCopied(true);
      toast('Results copied to clipboard', 'success');
      setTimeout(() => setShowShareCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <PublicPage>
        <p className="text-center py-20 text-proddaily-text-2">Loading puzzle…</p>
      </PublicPage>
    );
  }

  if (!hasPuzzle) {
    return (
      <PublicPage>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="heading-mark font-serif text-4xl text-proddaily-text mb-4">No puzzle today</h1>
          <p className="text-proddaily-text-2 mb-6">There is no daily word set for today. Check back soon.</p>
          <p className="text-sm text-proddaily-text-2">Next puzzle in {formatCountdown(countdown)}</p>
        </div>
      </PublicPage>
    );
  }

  const won = gameStatus === 'won' || gameStatus === 'completed';

  return (
    <PublicPage>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <span className="stencil">Today · {formatDisplayDate(today)}</span>
          </div>
          <h1 className="heading-mark font-serif text-5xl text-proddaily-text">Daily Wordle</h1>
          <p className="text-sm text-proddaily-text-2 mt-3">One word. Six tries.</p>
          <p className="mt-2 text-xs text-proddaily-text-2 flex items-center justify-center gap-2">
            <Clock size={14} />
            Next puzzle in {formatCountdown(countdown)}
          </p>
        </div>

        {isFinished && (
          <div className="flex items-center justify-center gap-3 mb-4 animate-fade-in">
            {won ? (
              <div className="flex items-center gap-2 text-green-400">
                <Trophy size={20} />
                <span className="font-medium">Solved in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <Skull size={20} />
                <span className="font-medium">The word was: {answer}</span>
              </div>
            )}
          </div>
        )}

        <div className={`play-panel flex justify-center mb-8 px-3 py-6 ${shakeRow ? 'animate-shake' : ''}`}>
          <WordleGrid
            guesses={guesses}
            currentGuess={currentGuess}
            answer={answer}
            feedbackRows={feedbackRows}
            revealingRow={revealingRow}
            isCurrentRow={!isFinished}
          />
        </div>

        {isFinished ? (
          <div className="flex flex-col items-center gap-4">
            <Button onClick={() => setShowResult(true)} variant="secondary">
              View Results
            </Button>
          </div>
        ) : (
          <Keyboard
            onKey={handleKey}
            onEnter={() => void submitGuess()}
            onBackspace={handleBackspace}
            letterStatus={letterStatus}
            disabled={revealingRow !== null || submitting}
          />
        )}
      </div>

      <Modal open={showResultModal} onClose={() => setShowResult(false)} title="Results">
        <div className="text-center">
          {won ? (
            <>
              <div className="w-16 h-16 rounded-street bg-green-950/40 border border-green-900/40 flex items-center justify-center mx-auto mb-4">
                <Trophy size={32} className="text-green-400" />
              </div>
              <h3 className="font-serif text-3xl text-proddaily-text mb-2">Solved</h3>
              <p className="text-proddaily-text-2 mb-6">
                You found today&apos;s word in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-street bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto mb-4">
                <Skull size={32} className="text-red-400" />
              </div>
              <h3 className="font-serif text-3xl text-proddaily-text mb-2">Better luck tomorrow</h3>
              <p className="text-proddaily-text-2 mb-6">
                The word was <span className="pd-accent-text font-bold">{answer}</span>
              </p>
            </>
          )}

          <div className="bg-proddaily-bg-2 rounded-lg p-4 mb-6 text-left">
            <pre className="text-xs leading-relaxed font-mono text-proddaily-text whitespace-pre-wrap">
              {feedbackRows.length
                ? buildShareTextFromFeedback(guesses, feedbackRows, won, today)
                : buildShareText(guesses, answer ?? '', won, today)}
            </pre>
          </div>

          <Button onClick={handleCopy} className="w-full max-w-xs">
            {showShareCopied ? <Check size={18} /> : <Copy size={18} />}
            {showShareCopied ? 'Copied' : 'Share Results'}
          </Button>
        </div>
      </Modal>
    </PublicPage>
  );
}
