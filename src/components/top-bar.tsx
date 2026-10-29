// ===========================================================================
// FILE:  components/top-bar.tsx
// ROLE:  The horizontal bar above the main content. Search, store, account.
//
// WHY THE STORE SELECTOR MATTERS
//   A buyer can own several stores, and POST /orders requires a storeId.
//   Every price, every total, every order on the page belongs to ONE store.
//   If that context is invisible, Marie can order 40 kg for the wrong
//   location and only find out when it arrives.
//
//   So the selected store is always on screen, and always switchable.
//
// ---------------------------------------------------------------------------
// WHAT TO BUILD
// ---------------------------------------------------------------------------
//
// Full width to the right of the sidebar. White background, hairline bottom
// border, roughly 64px tall, contents vertically centred.
//
// 1. SEARCH FIELD — left, wide (about 440px)
//      Placeholder: "Rechercher un produit"
//      A lucide Search icon inside, on the left.
//      Use the shadcn Input from @/components/ui/input.
//      No search logic yet — presentation only.
//
// 2. STORE SELECTOR — right side
//      Shows the current store: "Épicerie Marie" with a chevron.
//      Use the shadcn Select from @/components/ui/select.
//      For now, pass the list of stores as a prop and hardcode one entry.
//
// 3. AVATAR — far right
//      A 32px circle with the buyer's initials, e.g. "EM".
//      Light grey background, dark text, centred.
//      No dropdown yet.
//
// PROPS
//   stores        the buyer's stores
//   currentStore  which one is selected
//   initials      two letters for the avatar
//
// This component renders only. It never fetches.
//
// LATER
//   Changing the store must re-fetch the page, which needs an event handler,
//   which makes this a Client Component ('use client'). Leave that until we
//   cover Server vs Client Components properly — for now the selector can be
//   visual only.
// ===========================================================================

import { Search, ChevronDown} from 'lucide-react' ;
import { Input } from '@/components/ui/input';

interface TopBarProps {
    storeName: string;
    intitials: string;
}

function SearchField() {

    return(
    <div className='relative'>
       {
        <Search  className= "pointer-events-none absolute top-1/2 left-3 size-4 ">

        </Search>
       }


        </div>
    )

}
