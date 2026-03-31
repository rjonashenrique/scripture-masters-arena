import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bibleBooks } from '@/lib/bibleBooks';
import { useBibleChapter } from '@/hooks/useBible';

type View = 'books' | 'chapters' | 'reading';

export default function BibleReaderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookParam = searchParams.get('book');
  const chapterParam = searchParams.get('chapter');

  const initialBook = bookParam ? bibleBooks.find(b => b.name === bookParam) || bibleBooks[0] : bibleBooks[0];
  const initialChapter = chapterParam ? parseInt(chapterParam, 10) : 1;
  const initialView: View = bookParam ? 'reading' : 'books';

  const [view, setView] = useState<View>(initialView);
  const [selectedBook, setSelectedBook] = useState(initialBook);
  const [selectedChapter, setSelectedChapter] = useState(initialChapter);
  const [testament, setTestament] = useState<'old' | 'new'>('old');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useBibleChapter(selectedBook.name, view === 'reading' ? selectedChapter : 0);

  const filteredBooks = bibleBooks
    .filter(b => b.testament === testament)
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelectBook = (book: typeof bibleBooks[0]) => {
    setSelectedBook(book);
    if (book.chapters === 1) {
      setSelectedChapter(1);
      setView('reading');
    } else {
      setView('chapters');
    }
  };

  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(c => c - 1);
    }
  };

  const handleNextChapter = () => {
    if (selectedChapter < selectedBook.chapters) {
      setSelectedChapter(c => c + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => {
            if (view === 'reading') setView('chapters');
            else if (view === 'chapters') setView('books');
            else navigate('/');
          }}>
            <ArrowLeft size={24} className="text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold font-display text-foreground">
              {view === 'books' ? 'Bíblia Sagrada' : view === 'chapters' ? selectedBook.name : `${selectedBook.name} ${selectedChapter}`}
            </h1>
            {view === 'books' && <p className="text-xs text-muted-foreground">Tradução Almeida</p>}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Book List */}
          {view === 'books' && (
            <motion.div key="books" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Testament tabs */}
              <div className="flex gap-2 mb-4">
                {(['old', 'new'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTestament(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                      testament === t ? 'bg-primary text-primary-foreground' : 'glass-card text-muted-foreground'
                    }`}
                  >
                    {t === 'old' ? 'Antigo Testamento' : 'Novo Testamento'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar livro..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Books grid */}
              <div className="grid grid-cols-2 gap-2">
                {filteredBooks.map((book, i) => (
                  <motion.button
                    key={book.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleSelectBook(book)}
                    className="glass-card p-3 text-left active:scale-[0.97] transition-transform"
                  >
                    <p className="text-sm font-semibold text-foreground truncate">{book.name}</p>
                    <p className="text-[10px] text-muted-foreground">{book.chapters} capítulo{book.chapters > 1 ? 's' : ''}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chapter Selection */}
          {view === 'chapters' && (
            <motion.div key="chapters" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-muted-foreground mb-4">Selecione o capítulo</p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => { setSelectedChapter(ch); setView('reading'); }}
                    className="glass-card py-3 text-center font-bold text-foreground text-sm active:scale-95 transition-transform"
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Reading View */}
          {view === 'reading' && (
            <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <div className="flex flex-col items-center py-20">
                  <BookOpen size={32} className="text-muted-foreground animate-pulse mb-3" />
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <>
                  <div className="glass-card p-5 mb-4">
                    {data?.verses?.map((v: { verse: number; text: string }) => (
                      <p key={v.verse} className="text-sm leading-7 text-foreground mb-1">
                        <sup className="text-[10px] font-bold text-secondary mr-1">{v.verse}</sup>
                        {v.text.trim()}
                      </p>
                    )) || (
                      <p className="text-sm text-foreground leading-7 whitespace-pre-wrap">{data?.text}</p>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePrevChapter}
                      disabled={selectedChapter <= 1}
                      className="glass-card px-4 py-2 flex items-center gap-1 text-sm font-bold text-foreground disabled:opacity-30"
                    >
                      <ChevronLeft size={16} /> Anterior
                    </button>
                    <span className="text-sm font-bold text-muted-foreground">
                      {selectedChapter}/{selectedBook.chapters}
                    </span>
                    <button
                      onClick={handleNextChapter}
                      disabled={selectedChapter >= selectedBook.chapters}
                      className="glass-card px-4 py-2 flex items-center gap-1 text-sm font-bold text-foreground disabled:opacity-30"
                    >
                      Próximo <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
