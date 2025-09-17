import * as React from "react";
import Button from "@mui/joy/Button";
import { Box } from "@mui/joy";
import { useState } from "react";
import { CaretLineLeft as CaretLineLeft } from "@phosphor-icons/react/dist/ssr/CaretLineLeft";
import { ArrowLeft as ArrowLeft } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRight as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  disabled: boolean;
}

export default function Pagination({
  totalPages,
  currentPage,
  onPageChange,
  disabled
}: PaginationProps): React.JSX.Element {
  const handleFirstPage = () => {
    onPageChange(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    onPageChange(totalPages);
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };
 
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    // If total pages is 7 or less, show all pages
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }
    
    // Show first 3 pages
    for (let i = 1; i <= 3; i++) {
      pages.push(i);
    }
    
    // Add ellipsis if there's a gap
    if (totalPages > 6) {
      pages.push("...");
    }
    
    // Show last 3 pages
    for (let i = totalPages - 2; i <= totalPages; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div style={{ 
      display: "flex", 
      flexWrap: "wrap", 
      justifyContent: "center", 
      marginTop: "40px", 
      gap: "8px",
      padding: "0 8px"
    }}>
      <Button
        variant="outlined"
        onClick={handleFirstPage}
        disabled={disabled || currentPage === 1}
        sx={{
          borderRadius: "20px",
          padding: { xs: "6px 12px", sm: "8px 16px" },
          minWidth: "auto",
          height: { xs: "32px", sm: "40px" },
          display: { xs: "none", sm: "flex" },
          alignItems: "center",
          gap: "4px",
          color: currentPage === totalPages ? "var(--joy-palette-text-secondary)" : "var(--joy-palette-text-primary)",
          borderColor: "gray",
          fontSize: { xs: "12px", sm: "14px" }
        }}
      >
        <CaretLineLeft />
        <span>First</span>
      </Button>

      <Button
        variant="outlined"
        onClick={handlePreviousPage}
        disabled={disabled || currentPage === 1}
        sx={{
          borderRadius: "20px",
          padding: { xs: "6px 12px", sm: "8px 16px" },
          minWidth: "auto",
          height: { xs: "32px", sm: "40px" },
          display: "flex",
          alignItems: "center",
          gap: "4px",
          color: currentPage === totalPages ? "var(--joy-palette-text-secondary)" : "var(--joy-palette-text-primary)",
          borderColor: "gray",
          fontSize: { xs: "12px", sm: "14px" }
        }}
      >
        <ArrowLeft />
        <span>Previous</span>
      </Button>
     
      {getPageNumbers().map((page, index) =>
        typeof page === "number" ? (
          <Button
            key={index}
            variant="outlined"
            onClick={() => handlePageClick(page)}
            disabled={disabled}
            sx={{
              borderRadius: "50%",
              minWidth: { xs: "32px", sm: "40px" },
              height: { xs: "32px", sm: "40px" },
              fontSize: { xs: "12px", sm: "14px" },
              backgroundColor: currentPage === page ? "transparent" : "transparent",
              borderColor: currentPage === page ? "var(--joy-palette-primary-500)" : "#EEEFF0",
              borderWidth: currentPage === page ? "2px" : "1px",
              color: currentPage === page ? "var(--joy-palette-text-primary" : "var(--joy-palette-text-primary)",
              fontWeight: currentPage === page ? "600" : "400"
            }}
          >
            {page}
          </Button>
        ) : (
          <Box
            key={index}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: "32px", sm: "40px" },
              height: { xs: "32px", sm: "40px" },
              color: disabled ? "var(--joy-palette-text-disabled)" : "gray",
              fontSize: { xs: "12px", sm: "14px" }
            }}
          >
            {page}
          </Box>
        )
      )}
     
      <Button
        variant="outlined"
        onClick={handleNextPage}
        disabled={disabled || currentPage === totalPages}
        sx={{
          borderRadius: "20px",
          padding: { xs: "6px 12px", sm: "8px 16px" },
          minWidth: "auto",
          height: { xs: "32px", sm: "40px" },
          display: "flex",
          alignItems: "center",
          gap: "4px",
          color: currentPage === totalPages ? "var(--joy-palette-text-secondary)" : "var(--joy-palette-text-primary)",
          borderColor: "#EEEFF0",
          fontSize: { xs: "12px", sm: "14px" }
        }}
      >
        <span>Next</span>
        <ArrowRight />
      </Button>
      
      <Button
        variant="outlined"
        onClick={handleLastPage}
        disabled={disabled || currentPage === totalPages}
        sx={{
          borderRadius: "20px",
          padding: { xs: "6px 12px", sm: "8px 16px" },
          minWidth: "auto",
          height: { xs: "32px", sm: "40px" },
          display: { xs: "none", sm: "flex" },
          alignItems: "center",
          gap: "4px",
          color: currentPage === totalPages ? "var(--joy-palette-text-secondary)" : "var(--joy-palette-text-primary)",
          borderColor: "#EEEFF0",
          fontSize: { xs: "12px", sm: "14px" }
        }}
      >
        <span>Last</span>
        <ArrowRight />
      </Button>
    </div>
  );
}