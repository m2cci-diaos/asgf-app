import PublicLayout from '../layouts/PublicLayout'
import Home from '../public/pages/Home'
import Bureau from '../public/pages/Bureau'
import Formation from '../public/pages/Formation'
import Webinaires from '../public/pages/Webinaires'
import Adhesion from '../public/pages/Adhesion'
import AdhesionSuccess from '../public/pages/AdhesionSuccess'
import InscriptionFormation from '../public/pages/InscriptionFormation'
import InscriptionFormationSuccess from '../public/pages/InscriptionFormationSuccess'
import InscriptionWebinaire from '../public/pages/InscriptionWebinaire'
import InscriptionWebinaireSuccess from '../public/pages/InscriptionWebinaireSuccess'
import Projets from '../public/pages/Projets'

const canonicalRoutes = [
  { path: '/', element: <Home /> },
  { path: '/bureau', element: <Bureau /> },
  { path: '/formation', element: <Formation /> },
  { path: '/formation/inscription/:formationSlug', element: <InscriptionFormation /> },
  { path: '/formation/inscription/success', element: <InscriptionFormationSuccess /> },
  { path: '/webinaires', element: <Webinaires /> },
  { path: '/webinaire/inscription/:webinaireSlug', element: <InscriptionWebinaire /> },
  { path: '/webinaire/inscription/success', element: <InscriptionWebinaireSuccess /> },
  { path: '/adhesion', element: <Adhesion /> },
  { path: '/adhesion/success', element: <AdhesionSuccess /> },
  { path: '/projets', element: <Projets /> },
]

const legacyStaticRoutes = [
  { path: '/pages/bureau.html', element: <Bureau /> },
  { path: '/pages/formation.html', element: <Formation /> },
  { path: '/pages/webinaires.html', element: <Webinaires /> },
  { path: '/pages/adhesion.html', element: <Adhesion /> },
]

const publicRoutes = [
  {
    element: <PublicLayout />,
    children: [...canonicalRoutes, ...legacyStaticRoutes],
  },
]

export default publicRoutes

