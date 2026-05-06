import type { Prisma } from "@/generated/prisma";

export type ActiveShareLink = Pick<
	Prisma.ShareLinkGetPayload<true>,
	"id" | "shareId" | "viewCount" | "createdAt"
>;

export type PdfWithShareLinks = Prisma.PdfGetPayload<{
	include: {
		shareLinks: {
			where: { isActive: true };
			select: {
				id: true;
				shareId: true;
				viewCount: true;
				createdAt: true;
			};
		};
	};
}>;
