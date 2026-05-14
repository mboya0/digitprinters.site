/**
 * Loading Spinner Component
 */

export default function LoadingSpinner({ size = 'md', fullScreen = false }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const spinner = (
    <div className={`${sizeClasses[size]} border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin`} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center">{spinner}</div>;
}
