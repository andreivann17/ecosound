export default function TribunalPagination({
  total,
  pageSize,
  currentPage,
  setCurrentPage,
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-end mt-4 gap-2">
      {Array.from({ length: totalPages }).map((_, i) => {
        const page = i + 1;
        return (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 border rounded ${
              page === currentPage
                ? "bg-blue-50 border-blue-500 text-blue-600"
                : ""
            }`}
          >
            {page}
          </button>
        );
      })}
    </div>
  );
}
