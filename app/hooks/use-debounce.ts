import * as React from "react";

/**
 * Hook trả về giá trị debounced sau một khoảng delay (mặc định 400ms).
 * Dùng cho việc hoãn cập nhật giá trị (ví dụ: in-memory filter, search term).
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export type DebouncedFunction<T extends (...args: any[]) => void> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: (...args: Parameters<T>) => void;
};

/**
 * Hook trả về callback debounced, hủy lượt gọi trước nếu được gọi tiếp trước khi hết delay.
 * Cung cấp thêm phương thức:
 * - `cancel()`: Hủy lệnh chờ đang lập lịch.
 * - `flush(...args)`: Thực thi ngay lập tức không cần chờ timeout.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 400
): DebouncedFunction<T> {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = React.useCallback(
    (...args: Parameters<T>) => {
      cancel();
      callbackRef.current(...args);
    },
    [cancel]
  );

  const debouncedFn = React.useCallback(
    (...args: Parameters<T>) => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [cancel, delay]
  );

  React.useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return Object.assign(debouncedFn, { cancel, flush });
}

/**
 * Hook throttling: Giới hạn tần suất gọi hàm (tối đa 1 lần trong `limit` ms).
 * Áp dụng cho các thao tác click liên tục như 'Làm mới dữ liệu', kéo cuộn, hoặc gọi API.
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  limit: number = 600
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  const lastRunRef = React.useRef<number>(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttledFn = React.useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = limit - (now - lastRunRef.current);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        lastRunRef.current = now;
        callbackRef.current(...args);
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          timerRef.current = null;
          callbackRef.current(...args);
        }, remaining);
      }
    },
    [limit]
  );

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return throttledFn;
}
