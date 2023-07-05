import React from 'react'
import { Tooltip as ReactTooltip } from 'react-tooltip'

function UserAvatar({ user, width='30px', height='30px', fontSize='16px', tooltip, disableTooltip = false }) {
  return (
    <>
      <ReactTooltip id="user-avatar-tooltip" />
      {user?.avatar
        ? <div
          className="user-avatar"
          data-tooltip-id="user-avatar-tooltip"
          data-tooltip-content={!disableTooltip ? `${tooltip || user?.displayName}` : ''}>
          <img src={user?.avatar} style={{ 'width': width, 'height': height }} />
        </div>
        : <div
          className="default-avatar"
          data-tooltip-id="user-avatar-tooltip"
          style={{ 'width': width, 'height': height, 'fontSize': fontSize }}
          data-tooltip-content={!disableTooltip ? `${tooltip || user?.displayName}` : ''}>
          <span className='first-username-char'>{user?.displayName?.charAt(0) || 'A'}</span>
        </div>
      }
    </>
  )
}

export default UserAvatar
