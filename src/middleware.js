import { withAuth } from "next-auth/middleware";

// Export middleware directly
export default withAuth(
  // Function that runs when middleware is called
  function middleware(req) {
    return;
  },
  {
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*']
}; 