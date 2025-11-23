import { ModeToggle } from '@/components/mode-toggle'

export default function CustomHeader() {
  return (
    <header className="w-full px-16 py-4 flex justify-center border-b">
      <div className="flex items-center justify-between w-full gap-4">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">VLR Wave</h1>
        <ModeToggle />
      </div>
    </header>
  )
}
