import { describe, it, expect, vi } from 'vitest';
import { useTestSession } from './useTestSession';

describe('useTestSession', () => {
  it('should show development alert when startTestSession is called', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { startTestSession } = useTestSession();
    startTestSession();

    expect(alertSpy).toHaveBeenCalledWith(
      'Session testing is under development',
    );

    alertSpy.mockRestore();
  });

  it('should return startTestSession function', () => {
    const { startTestSession } = useTestSession();

    expect(startTestSession).toBeTypeOf('function');
  });
});
