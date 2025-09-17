"use client";

import Typography from "@mui/joy/Typography";
import { BreadcrumbsItem } from "@/components/core/breadcrumbs-item";
import { BreadcrumbsSeparator } from "@/components/core/breadcrumbs-separator";
import { paths } from "@/paths";
import { Breadcrumbs, Select, Option } from "@mui/joy";
import { Box, Stack } from "@mui/system";
import { getCategoryById } from "@/lib/api/categories";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import TiptapEditor from "@/components/TiptapEditor";
import { getArticleById } from "@/lib/api/articles";
import { useParams } from "next/navigation";
import { CircularProgress } from "@mui/joy";

const ArticlePageDetails = () => {
  const params = useParams();
  const articleId = params.articleId;

  const [videoId, setVideoId] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>(
    []
  );
  const [activeTocId, setActiveTocId] = useState<string>("");
  const [isTocFixed, setIsTocFixed] = useState(false);

  const {
    data: articleData,
    isLoading: isArticleLoading,
    error: articleError,
  } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => {
      if (!articleId) {
        throw new Error("Article ID is missing");
      }
      return getArticleById(Number(articleId));
    },
    enabled: !!articleId,
  });

  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useQuery({
    queryKey: ["category", articleData?.Category.id],
    queryFn: () => {
      if (!articleData?.Category.id) {
        throw new Error("Category ID is missing");
      }
      return getCategoryById(Number(articleData?.Category.id));
    },
    enabled: !!articleData?.Category.id,
  });

  useEffect(() => {
    if (articleData?.videoUrl) {
      const id = extractVideoId(articleData.videoUrl);
      setVideoId(id);
    } else {
      setVideoId(null);
    }
  }, [articleData?.videoUrl]);

  useEffect(() => {
    if (articleData?.content) {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(articleData.content, "text/html");
      const headings: { id: string; text: string; level: number }[] = [];
      const headingCounts: Record<string, number> = {};

      Array.from(doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6")).forEach(
        (el) => {
          const level = Number(el.tagName[1]);
          const text = el.textContent || "";
          const baseId = `heading-${text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}-${level}`;

          headingCounts[baseId] = (headingCounts[baseId] || 0) + 1;
          const count = headingCounts[baseId];

          const id = count > 1 ? `${baseId}-${count}` : baseId;

          if (el.getAttribute("id") !== id) {
            el.setAttribute("id", id);
          }

          headings.push({ id, text, level });
        }
      );

      setToc(headings);
    }
  }, [articleData?.content]);

  const extractVideoId = (url: string): string | null => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match?.[1] ?? null;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: "var(--Content-padding)" } }}>
      {isArticleLoading || isCategoryLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50vh",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 6, sm: 0 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 3 }}
              sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}
            >
              <Stack spacing={1} sx={{ flex: "1 1 auto" }}>
                <Typography
                  fontSize={{ xs: "xl2", sm: "xl3" }}
                  level="h1"
                  sx={{ wordBreak: "break-word" }}
                >
                  {articleData?.title}
                </Typography>
              </Stack>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1, sm: 2 }}
                sx={{
                  alignItems: { xs: "stretch", sm: "center" },
                  width: { xs: "100%", sm: "auto" },
                  position: "relative",
                }}
              ></Stack>
            </Stack>
          </Stack>
          <Stack sx={{ mt: { xs: 3, sm: 2 } }}>
            <Breadcrumbs separator={<BreadcrumbsSeparator />}>
              <BreadcrumbsItem
                href={paths.dashboard.documentation.list}
                type="start"
              />
              <BreadcrumbsItem href={paths.dashboard.documentation.list}>
                Documentation
              </BreadcrumbsItem>
              <BreadcrumbsItem
                href={paths.dashboard.documentation.details(
                  categoryData?.id?.toString() || ""
                )}
              >
                {categoryData?.name}
              </BreadcrumbsItem>
              <BreadcrumbsItem type="end">{articleData?.title}</BreadcrumbsItem>
            </Breadcrumbs>
          </Stack>

          {toc.length > 0 && (
            <Box sx={{ mt: 4, display: { xs: "block", sm: "none" } }}>
              <Typography
                sx={{
                  fontWeight: 300,
                  color: "var(--joy-palette-text-secondary)",
                  mb: 1,
                  fontSize: 14,
                }}
              >
                On this article
              </Typography>
              <Select value={activeTocId || ""} placeholder="Select a section">
                {toc.map((item) => (
                  <Option
                    key={item.id}
                    value={item.id}
                    onClick={() => {
                      const el = document.getElementById(item.id);
                      if (el) {
                        const yOffset = -100;
                        const y =
                          el.getBoundingClientRect().top +
                          window.pageYOffset +
                          yOffset;
                        window.scrollTo({ top: y, behavior: "smooth" });
                        setActiveTocId(item.id);
                      }
                    }}
                  >
                    {item.text}
                  </Option>
                ))}
              </Select>
            </Box>
          )}

          <Box
            sx={{
              display: { xs: "block", sm: "flex" },
              gap: 3,
              borderTop: "1px solid var(--joy-palette-divider)",
              mt: 3,
              mb: 6,
            }}
          >
            <Box
              sx={{
                flex: 2,
                borderRight: {
                  xs: "none",
                  sm: "1px solid var(--joy-palette-divider)",
                },
                pr: { xs: 0, sm: 3 },
                pt: 1,
              }}
            >
              <TiptapEditor
                isPreview={true}
                onChange={setContent}
                content={articleData?.content || ""}
                onTocChange={setToc}
              />
            </Box>

            <Box sx={{ flex: 0.7, mt: { xs: 4, sm: 2 } }}>
              {videoId && (
                <Box
                  sx={{
                    mt: 1,
                    mb: 3,
                    border: "1px solid #E5E8EB",
                    borderRadius: "6px",
                    overflow: "hidden",
                    backgroundColor: "#F9FAFB",
                  }}
                >
                  <Box sx={{ position: "relative", paddingTop: "56.25%" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  </Box>
                </Box>
              )}

              {toc.length > 0 && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "8px",
                    border: "1px solid #eee",
                    position: isTocFixed ? "sticky" : "static",
                    top: "150px",
                    transition: "all 0.3s ease",
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 300,
                      color: "var(--joy-palette-text-secondary)",
                      mb: 1,
                      fontSize: 14,
                    }}
                  >
                    On this article
                  </Typography>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {toc.map((item) => (
                      <li
                        key={item.id}
                        style={{ marginBottom: "15px", marginLeft: "10px" }}
                      >
                        <a
                          href={`#${item.id}`}
                          style={{
                            color: activeTocId === item.id ? "#3d37dd" : "#222",
                            fontWeight: item.level === 1 ? 600 : 400,
                            fontSize: 14,
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(item.id);
                            if (el) {
                              const yOffset = -100;
                              const y =
                                el.getBoundingClientRect().top +
                                window.pageYOffset +
                                yOffset;
                              window.scrollTo({ top: y, behavior: "smooth" });
                              setActiveTocId(item.id);
                              setIsTocFixed(true);
                            }
                          }}
                        >
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ArticlePageDetails;
